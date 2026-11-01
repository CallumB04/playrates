/** How long a drawn picture (player card, list, Gaming 25) is kept. */
export const PICTURE_CACHE = {
  /** A versioned URL names one state of the picture, so it never goes
   *  stale. */
  versioned: "public, max-age=31536000, immutable",
  /** An unversioned one is a link preview's, refreshed every few minutes. */
  unversioned:
    "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
} as const;
