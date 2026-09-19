import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/msw/server";
import { ApiError, api } from "./client";
import { fetchGames, fetchProfileByUsername } from "./index";

const API = "http://localhost:3000/api/v1";

describe("api client", () => {
    it("prefixes requests with the versioned API base", async () => {
        const page = await fetchGames();
        expect(page.data).toHaveLength(2);
    });

    /** The interceptor is why every endpoint gets auth for free. */
    it("attaches the Supabase access token", async () => {
        let seen: string | null = null;
        server.use(
            http.get(`${API}/games`, ({ request }) => {
                seen = request.headers.get("Authorization");
                return HttpResponse.json({
                    data: [],
                    meta: { page: 1, limit: 25, total: 0 },
                });
            })
        );

        await fetchGames();
        expect(seen).toBe("Bearer test-access-token");
    });

    it("passes filters through as query parameters", async () => {
        let url = "";
        server.use(
            http.get(`${API}/games`, ({ request }) => {
                url = request.url;
                return HttpResponse.json({
                    data: [],
                    meta: { page: 1, limit: 25, total: 0 },
                });
            })
        );

        await fetchGames({ search: "portal", includeAdult: false });
        expect(url).toContain("search=portal");
        expect(url).toContain("includeAdult=false");
    });

    describe("error mapping", () => {
        /**
         * The old layer collapsed every failure into
         * `new Error("Error fetching user")`, so a caller could not tell a
         * missing record from a broken backend. These pin that it no longer
         * does.
         */
        it("preserves the status and code from the API", async () => {
            server.use(
                http.get(`${API}/profiles/:username`, () =>
                    HttpResponse.json(
                        {
                            error: {
                                code: "not_found",
                                message: "Profile not found",
                            },
                        },
                        { status: 404 }
                    )
                )
            );

            const error = await fetchProfileByUsername("ghost").catch((e) => e);

            expect(error).toBeInstanceOf(ApiError);
            expect(error.status).toBe(404);
            expect(error.code).toBe("not_found");
            expect(error.message).toBe("Profile not found");
            expect(error.isNotFound).toBe(true);
            expect(error.isServerError).toBe(false);
        });

        it("flags auth failures distinctly from not-found", async () => {
            server.use(
                http.get(`${API}/profiles/me`, () =>
                    HttpResponse.json(
                        { error: { code: "unauthorized", message: "nope" } },
                        { status: 401 }
                    )
                )
            );

            const error = await api.get("/profiles/me").catch((e) => e);
            expect(error.isUnauthorized).toBe(true);
            expect(error.isNotFound).toBe(false);
        });

        it("exposes validation details so a form can highlight a field", async () => {
            server.use(
                http.put(`${API}/me/game-logs/1`, () =>
                    HttpResponse.json(
                        {
                            error: {
                                code: "validation_failed",
                                message: "Request validation failed",
                                details: {
                                    rating: [
                                        "Rating must be a multiple of 0.25",
                                    ],
                                },
                            },
                        },
                        { status: 422 }
                    )
                )
            );

            const error = await api
                .put("/me/game-logs/1", { status: "played" })
                .catch((e) => e);

            expect(error.isValidation).toBe(true);
            expect(error.details).toEqual({
                rating: ["Rating must be a multiple of 0.25"],
            });
        });

        it("marks 5xx as a server error", async () => {
            server.use(
                http.get(`${API}/games`, () =>
                    HttpResponse.json(
                        { error: { code: "internal_error", message: "boom" } },
                        { status: 500 }
                    )
                )
            );

            const error = await fetchGames().catch((e) => e);
            expect(error.isServerError).toBe(true);
        });

        it("still produces an ApiError when the body is not our envelope", async () => {
            server.use(
                http.get(`${API}/games`, () =>
                    HttpResponse.text("gateway timeout", { status: 504 })
                )
            );

            const error = await fetchGames().catch((e) => e);
            expect(error).toBeInstanceOf(ApiError);
            expect(error.status).toBe(504);
        });
    });
});
