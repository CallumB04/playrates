// iOS zooms the page in when a field under 16px takes focus, and never zooms
// back out. maximum-scale=1 stops that, and on iOS only: Safari there ignores
// it for pinching, so nobody loses zoom, where Android would lose it
// entirely (and never zooms on focus to begin with). So fields can be set at
// the size the rest of the page is.
//
// A file rather than inline, for the CSP; see theme-init.js.
(function () {
    var ua = navigator.userAgent;
    // iPadOS reports a Mac; a Mac has no touch points.
    var iOS =
        /iPad|iPhone|iPod/.test(ua) ||
        (ua.indexOf("Macintosh") !== -1 && navigator.maxTouchPoints > 1);
    if (!iOS) return;
    var viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute(
            "content",
            "width=device-width, initial-scale=1.0, maximum-scale=1"
        );
    }
})();
