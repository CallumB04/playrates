/** The parts of a marketing/tiktok/posts/*.json file the admin page shows. */
export interface TikTokSong {
    track: string;
    artist: string;
    why: string;
}

export interface TikTokPostFile {
    tiktok: {
        title: string;
        description: string;
        song: TikTokSong;
        altSong: TikTokSong;
        musicSearch: string;
        pinnedComment: string;
        when: string;
    };
    games: unknown[];
}

export interface ChecklistEntry {
    name: string;
    posted: boolean;
    date: string | null;
    url: string | null;
}

export interface TikTokPostRow extends ChecklistEntry {
    file: TikTokPostFile | null;
    /** False for a post file nobody has put on the checklist yet. */
    listed: boolean;
}

/* Only a task at the start of a line counts, so the indented example in
   POSTS.md's own instructions isn't read as a post. The name comes from the
   link target rather than its text, which is free to say anything. */
const TASK = /^- \[([ xX])\] \[[^\]]*\]\(posts\/([^)]+)\.json\)(.*)$/;

/** The task list in marketing/tiktok/POSTS.md, in its order. */
export const parseChecklist = (markdown: string): ChecklistEntry[] =>
    markdown.split("\n").flatMap((line) => {
        const match = line.trimEnd().match(TASK);
        if (!match) return [];
        const [, tick, name, rest] = match;
        return [
            {
                name: name!,
                posted: tick !== " ",
                date: rest!.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null,
                url: rest!.match(/https?:\/\/\S+/)?.[0] ?? null,
            },
        ];
    });

/** import.meta.glob keys are paths; a post is known by its file name. */
export const postsByName = <T>(modules: Record<string, T>) =>
    Object.fromEntries(
        Object.entries(modules).map(([file, post]) => [
            file
                .split("/")
                .pop()!
                .replace(/\.json$/, ""),
            post,
        ])
    );

/**
 * The checklist's posts in its order, then any post file it doesn't mention,
 * so a post that was written but never listed still shows up rather than
 * quietly going missing.
 */
export const joinPosts = (
    checklist: ChecklistEntry[],
    files: Record<string, TikTokPostFile>
): TikTokPostRow[] => {
    const listed = new Set(checklist.map((entry) => entry.name));
    return [
        ...checklist.map((entry) => ({
            ...entry,
            file: files[entry.name] ?? null,
            listed: true,
        })),
        ...Object.keys(files)
            .filter((name) => !listed.has(name))
            .sort()
            .map((name) => ({
                name,
                posted: false,
                date: null,
                url: null,
                file: files[name]!,
                listed: false,
            })),
    ];
};

export const upNext = (rows: TikTokPostRow[]): TikTokPostRow | null =>
    rows.find((row) => row.listed && !row.posted && row.file) ?? null;
