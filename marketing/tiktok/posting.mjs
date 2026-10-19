const song = ({ track, artist, why }) => `**${track}** by ${artist}. ${why}`;

/**
 * A video's caption: the title runs straight into the description, so a
 * title that ends mid-sentence gets a full stop rather than "everyone Eight".
 */
export const videoCaption = ({ title, description }) =>
  `${/(\p{P}|\p{Extended_Pictographic}\uFE0F?)$/u.test(title) ? title : `${title}.`} ${description}`;

/**
 * Everything typed into TikTok alongside the slides, plus the steps that are
 * easy to forget, as a checklist to work through while posting.
 */
export const postingNotes = (post, slideCount, video = false) => {
  const { title, description, song: first, altSong, musicSearch } = post.tiktok;
  // A video has no title field in TikTok: both go in the caption.
  const copy = video
    ? `## Caption

${videoCaption(post.tiktok)}
`
    : `## Title

${title}

## Description

${description}
`;
  return `# ${title}

${copy}
## Sound

- ${song(first)}
- Or ${song(altSong)}

Search for the sound in the app before relying on it: what's available
varies by region. If neither is there, search for: ${musicSearch}.

## Pin this comment

${post.tiktok.pinnedComment}

## When

${post.tiktok.time ?? "21:00"} Estonian time. ${post.tiktok.when}

## Checklist

${video ? "- [ ] Upload video.mp4 on the Videos tab, and check the cover is the intro card." : `- [ ] Upload all ${slideCount} slides in order, 01 first. Slide 1 is the cover.`}
- [ ] ${video ? "Replace the caption TikTok fills in with the one above" : "Paste the title and description"}, and add the sound.
- [ ] playrates.app is still written in the profile bio. Descriptions aren't
      clickable, and a personal account can't add a bio link until 1,000
      followers.
- [ ] Pin the comment above as soon as the post is live.
- [ ] Reply to the first comments in the first hour.
`;
};
