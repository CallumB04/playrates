import checklist from "../../../../../marketing/tiktok/POSTS.md?raw";
import {
    joinPosts,
    parseChecklist,
    postsByName,
    type TikTokPostFile,
} from "../lib/tiktokPosts";

/* Read from the repo at build time, so the page shows what was committed when
   the site was last deployed. The repo is the record: posting a TikTok and
   ticking it off in POSTS.md stay one step, made in one place. */
const files = import.meta.glob<TikTokPostFile>(
    "../../../../../marketing/tiktok/posts/*.json",
    { eager: true, import: "default" }
);

export const TIKTOK_POSTS = joinPosts(
    parseChecklist(checklist),
    postsByName(files)
);
