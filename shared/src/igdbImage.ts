/** IGDB's named sizes that the app uses. */
export type IgdbSize =
  | "cover_small"
  | "cover_big"
  | "cover_big_2x"
  | "screenshot_med"
  | "screenshot_big"
  | "screenshot_huge"
  | "720p"
  | "1080p";

const SIZE_SEGMENT = /\/t_[a-z0-9_]+\//;

/** Whether a picture is on IGDB's image server, where a URL names its size
 *  and any other size is the same address with that part swapped. */
export const isIgdbImage = (url: string): boolean =>
  url.startsWith("https://images.igdb.com/") && SIZE_SEGMENT.test(url);

/** The same IGDB picture at another size; anything else comes back as is. */
export const igdbSized = (url: string, size: IgdbSize): string =>
  isIgdbImage(url) ? url.replace(SIZE_SEGMENT, `/t_${size}/`) : url;
