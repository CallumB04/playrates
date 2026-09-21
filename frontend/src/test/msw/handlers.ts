import { http, HttpResponse } from "msw";
import type {
    FriendEdge,
    Game,
    Paginated,
    Profile,
    ReviewWithAuthor,
} from "@playrates/shared";
import type { GameLogWithGame } from "../../api";

const API = "http://localhost:3000/api/v1";

/** Wraps rows in the envelope every list endpoint returns. */
export const paginated = <T>(data: T[]): Paginated<T> => ({
    data,
    meta: { page: 1, limit: 25, total: data.length },
});

export const buildProfile = (overrides: Partial<Profile> = {}): Profile => ({
    id: "11111111-1111-1111-1111-111111111111",
    username: "devuser",
    firstName: null,
    bio: "Local development account.",
    showSexualContent: false,
    avatarUrl: null,
    online: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
});

export const buildGame = (overrides: Partial<Game> = {}): Game => ({
    id: 1,
    rawgId: 3328,
    slug: "the-witcher-3-wild-hunt",
    title: "The Witcher 3: Wild Hunt",
    description: "An open world RPG.",
    coverUrl: "https://example.test/witcher.jpg",
    releaseDate: "2015-05-18",
    platforms: ["steam"],
    hasSexualContent: false,
    logCount: 0,
    avgRating: null,
    ratingCount: 0,
    isTrending: true,
    playtimeHours: 51.5,
    genres: ["action", "role-playing-games-rpg"],
    metacritic: 92,
    rawgRating: 4.66,
    rawgRatingCount: 6900,
    ...overrides,
});

export const buildGameLog = (
    overrides: Partial<GameLogWithGame> = {}
): GameLogWithGame => ({
    id: 10,
    gameId: 1,
    status: "played",
    playedStatus: "finished",
    rating: 9.25,
    hoursPlayed: 60,
    hoursToBeat: null,
    startDate: null,
    finishDate: null,
    platform: "steam",
    achievementsTotal: null,
    achievementsCompleted: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    game: {
        id: 1,
        title: "The Witcher 3: Wild Hunt",
        slug: "the-witcher-3-wild-hunt",
        coverUrl: "https://example.test/witcher.jpg",
        releaseDate: "2015-05-18",
        platforms: ["steam"],
    },
    ...overrides,
});

export const buildReview = (
    overrides: Partial<ReviewWithAuthor> = {}
): ReviewWithAuthor => ({
    id: 1,
    gameId: 1,
    body: "Still the benchmark for open world side quests.",
    isPublic: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    author: {
        id: "11111111-1111-1111-1111-111111111111",
        username: "devuser",
        firstName: null,
        avatarUrl: null,
        online: true,
    },
    rating: 9.5,
    hoursPlayed: 41,
    voteCount: 3,
    votedByViewer: false,
    status: "played",
    playedStatus: "finished",
    platform: "steam",
    game: {
        id: 1,
        title: "The Witcher 3: Wild Hunt",
        coverUrl: "https://example.test/witcher.jpg",
    },
    ...overrides,
});

export const buildFriendEdge = (
    overrides: Partial<FriendEdge> = {}
): FriendEdge => ({
    status: "friend",
    user: {
        id: "22222222-2222-2222-2222-222222222222",
        username: "frienduser",
        avatarUrl: null,
        bio: "",
        online: false,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
});

/**
 * Default happy-path handlers. Individual tests override one route with
 * server.use(...) rather than redefining the whole set.
 */
export const handlers = [
    http.get(`${API}/stats`, () =>
        HttpResponse.json({ userCount: 2, gameCount: 6, logCount: 1 })
    ),

    http.get(`${API}/platforms`, () =>
        HttpResponse.json({
            data: [
                {
                    slug: "steam",
                    displayName: "Steam",
                    sortOrder: 10,
                },
            ],
        })
    ),

    http.get(`${API}/games`, () =>
        HttpResponse.json(
            paginated([
                buildGame(),
                buildGame({
                    id: 2,
                    title: "Portal 2",
                    isTrending: false,
                    releaseDate: "2011-04-18",
                }),
            ])
        )
    ),

    http.get(`${API}/games/:id`, ({ params }) =>
        HttpResponse.json(buildGame({ id: Number(params.id) }))
    ),

    http.get(`${API}/profiles/me`, () => HttpResponse.json(buildProfile())),

    http.get(`${API}/profiles/check-username`, ({ request }) => {
        const username = new URL(request.url).searchParams.get("username");
        return HttpResponse.json({ available: username !== "devuser" });
    }),

    http.get(`${API}/profiles/:username`, ({ params }) =>
        HttpResponse.json(buildProfile({ username: String(params.username) }))
    ),

    http.get(`${API}/me/game-logs`, () =>
        HttpResponse.json(paginated([buildGameLog()]))
    ),

    http.get(`${API}/users/:username/game-logs`, () =>
        HttpResponse.json(paginated([buildGameLog()]))
    ),

    http.get(`${API}/users/:username/reviews`, () =>
        HttpResponse.json(paginated([buildReview()]))
    ),

    http.get(`${API}/games/:id/reviews`, () =>
        HttpResponse.json(paginated([buildReview()]))
    ),

    http.get(`${API}/me/friends`, () =>
        HttpResponse.json({ data: [buildFriendEdge()] })
    ),

    http.get(`${API}/users/:username/friends`, () =>
        HttpResponse.json({ data: [buildFriendEdge()] })
    ),
];

export { API as API_BASE };
