/** A release's title in two: the version ("v1.1") and what follows it
 *  ("Major updates"), so the version can stand out. A title that doesn't
 *  open with a version is all name. */
export const splitReleaseTitle = (
    title: string
): { version: string | null; name: string | null } => {
    const match = /^(v\d+(?:\.\d+)*)(?:\s*[-–—:|]\s*|\s+)?(.*)$/i.exec(
        title.trim()
    );
    if (!match) return { version: null, name: title.trim() || null };
    return { version: match[1]!, name: match[2]!.trim() || null };
};
