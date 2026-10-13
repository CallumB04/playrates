/** Whether a nav link points at where we already are. NavLink matches on
 *  pathname only, and some links carry a query string that matters. */
export const isCurrent = (
    to: string,
    exact: boolean,
    pathname: string,
    search: string
): boolean => {
    const [path, query] = to.split("?");

    const pathMatches = exact
        ? pathname === path
        : pathname === path || pathname.startsWith(`${path}/`);
    if (!pathMatches) return false;
    if (!query) return true;

    const wanted = new URLSearchParams(query);
    const actual = new URLSearchParams(search);
    return [...wanted].every(([key, value]) => actual.get(key) === value);
};
