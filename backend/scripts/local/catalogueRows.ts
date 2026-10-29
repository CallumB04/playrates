type Row = Record<string, unknown>;

/**
 * A snapshot game as the seed inserts it. jsonb_populate_recordset turns a
 * missing key into null rather than the column default, so a not-null column
 * added since the snapshot was taken has to be filled in here.
 */
export const seedGame = (g: Row): Row => ({
  ...g,
  alt_names: g.alt_names ?? [],
  // Counts and averages are the triggers' to work out from local logs.
  log_count: 0,
  avg_rating: null,
  rating_count: 0,
});
