import { describe, expect, it } from "vitest";
import { readAuthRedirectError } from "./authRedirect";

describe("readAuthRedirectError", () => {
    it("ignores an address with no error on it", () => {
        expect(
            readAuthRedirectError("https://playrates.app/games?q=zelda")
        ).toBeNull();
    });

    it("reads a cancel from the query and keeps the rest of it", () => {
        expect(
            readAuthRedirectError(
                "https://playrates.app/games?q=zelda&error=access_denied&error_code=403&error_description=User+denied"
            )
        ).toEqual({
            cancelled: true,
            cleanUrl: "https://playrates.app/games?q=zelda",
        });
    });

    it("reads one from the hash, where the implicit flow puts it", () => {
        expect(
            readAuthRedirectError(
                "https://playrates.app/#error=server_error&error_description=Unable+to+exchange"
            )
        ).toEqual({ cancelled: false, cleanUrl: "https://playrates.app/" });
    });
});
