const song = ({ track, artist, why }) => `**${track}** by ${artist}. ${why}`;

/**
 * Everything typed into TikTok alongside the slides, plus the steps that are
 * easy to forget, as a checklist to work through while posting.
 */
export const postingNotes = (post, slideCount) => {
  const { title, description, song: first, altSong, musicSearch } = post.tiktok;
  return `# ${title}

## Title

${title}

## Description

${description}

## Sound

- ${song(first)}
- Or ${song(altSong)}

Business accounts can only use TikTok's Commercial Music Library, so neither
may be there. If not, search the library for: ${musicSearch}. Search for the
sound in the app before posting either way; what's available varies by
account and region.

## Pin this comment

${post.tiktok.pinnedComment}

## When

${post.tiktok.when}

## Checklist

- [ ] Upload all ${slideCount} slides in order, 01 first. Slide 1 is the cover.
- [ ] Paste the title and description, and add the sound.
- [ ] playrates.app is in the profile bio. Descriptions aren't clickable, and
      the description says "link in bio".
- [ ] Pin the comment above as soon as the post is live.
- [ ] Reply to the first comments in the first hour.
`;
};
