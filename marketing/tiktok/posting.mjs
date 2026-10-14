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

Search for the sound in the app before relying on it: what's available
varies by region. If neither is there, search for: ${musicSearch}.

## Pin this comment

${post.tiktok.pinnedComment}

## When

${post.tiktok.when}

## Checklist

- [ ] Upload all ${slideCount} slides in order, 01 first. Slide 1 is the cover.
- [ ] Paste the title and description, and add the sound.
- [ ] playrates.app is still written in the profile bio. Descriptions aren't
      clickable, and a personal account can't add a bio link until 1,000
      followers.
- [ ] Pin the comment above as soon as the post is live.
- [ ] Reply to the first comments in the first hour.
`;
};
