// Apply the stored theme before first paint, otherwise the page renders in
// the default theme and visibly flips. Must agree with ThemeContext.tsx: same
// key, same default, same "system" rule.
//
// A file rather than inline in index.html so the site's CSP can stay at
// script-src 'self', with no hash to keep in step with this code.
(function () {
    try {
        var stored = localStorage.getItem("playrates-theme");
        var theme =
            stored === "light" || stored === "dark"
                ? stored
                : stored === "system" &&
                    window.matchMedia("(prefers-color-scheme: light)").matches
                  ? "light"
                  : "dark";
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.documentElement.style.colorScheme = theme;
    } catch (e) {
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
    }
})();
