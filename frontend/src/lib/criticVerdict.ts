/** Good from 75, mixed from 50, poor below: where critics' averages
 *  usually split. */
export const criticVerdict = (score: number): string =>
    score >= 75
        ? "Generally favourable"
        : score >= 50
          ? "Mixed or average"
          : "Generally unfavourable";
