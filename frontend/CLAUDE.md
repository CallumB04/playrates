# Frontend

React 19, Vite, TanStack Query, Tailwind v4. Pages in `src/pages`, shared
pieces in `src/components`, primitives in `src/components/ui`.

## Mobile is not an afterthought

Every feature has to _work_ on a phone, not merely reflow onto one. Build the
mobile behaviour alongside the desktop one, in the same change.

- **Overlays are bottom sheets below `sm`.** `ui/Modal` already does this;
  reach for it rather than hand-rolling a dialog.
- **Nothing important sits behind hover.** A touch screen cannot hover, and
  there are no `@media (hover)` queries here. Anything revealed on hover needs
  a standing equivalent below `sm`.
- **44px minimum for anything tappable.** Where the control should stay small
  visually, grow the hit area instead of the glyph:
  `relative before:absolute before:-inset-2 before:content-['']`.
- **Form fields use the page's own sizes** (`text-body-sm`), phones included.
  iOS Safari zooms the page in on focus below 16px and never zooms back out;
  `public/viewport-init.js` stops that by pinning `maximum-scale=1` on iOS
  only, where pinch-zoom still works. Do not reach for `text-base` on a field.
- **Type steps down on a phone.** The display tokens clamp to smaller minimums,
  and a fixed size (`text-[28px]`) gets a smaller phone value with the larger
  one from `sm:`. Check 375px for anything that reads as shouting.
- **`dvh`, not `vh`**, for anything sized to the viewport. `vh` measures
  against the viewport with the browser chrome retracted.
- Primary actions go full width on a phone: `w-full sm:w-auto`.
- Sections a phone can't fit in a row switch through `ui/SectionSwitcher`,
  as the profile, Settings, Admin and the Shop do.
- Check 375px before calling it done. Watch for horizontal overflow: `html`
  sets `overflow-x: hidden`, which hides overflow rather than preventing it, so
  it will not show up in a screenshot: compare `scrollWidth` to `clientWidth`.

## Styling

Tailwind v4, configured entirely in `src/styles/theme.css`; there is no
`tailwind.config`. Use the semantic tokens (`text-content-secondary`,
`bg-surface-raised`, `border-subtle`, `shadow-plate`), never raw palette
values or stock Tailwind colours. Brand-coloured text is `text-brand-text`,
never `text-brand`, which fails contrast. Dark is the default and both themes
must work; `/admin/design` renders the component library.

A file that exports a component exports only components, or editing it
reloads the whole page instead of hot-swapping it (lint warns). Helpers,
hooks, constants and class builders go in a `.ts` file beside it:
`ui/buttonClass.ts` beside `ui/Button.tsx`, `contexts/AuthContext.tsx` (the
context and `useAuth`) beside `contexts/AuthProvider.tsx`.

`cn()` joins classes without merging them, so a class passed in beside a
default leaves both and the stylesheet picks. Extend a primitive with a named
variant or tone instead of overriding it at the call site.

## Use the primitives

- `ui/Button` / `buttonClass` (on a `Link`): variants `primary`, `secondary`,
  `outline`, `ghost`, `danger`; sizes up to `touch` (48px). Pressed actions
  are rounded rectangles; pills are toggles or counts.
- `ui/Card` / `cardClass` with its tones, `Panel` and `AsideCard`; the rules
  for which surface fits what are in `Card.tsx`. A page's own header never
  sits in a card, and a page has one `feature` card at most.
- `ui/Modal` for every overlay, `ui/ConfirmPopup` for every "are you sure",
  `ui/Dropdown` for every select, `ui/SegmentedChoice` for a short fixed set
  of options, `ui/Toggle` for on and off.
- `ui/EmptyPlate` and `EmptyNote` for empty states, `ui/Skeleton` while
  loading, `components/SignUpPlate` where a page needs an account.

## Accessibility

- Every control shows focus: the base `:focus-visible` ring in `theme.css`,
  or the component's own `focus-visible:outline-*`. Never remove an outline
  without replacing it.
- Icon-only controls have an `aria-label`; decorative icons are
  `aria-hidden`. Where colour carries meaning, words or `sr-only` text carry
  it too.
- Current place in a nav is `aria-current`. Dialogs come from `Modal`, which
  labels itself, traps Tab, closes on Escape and hands focus back.
- Pictures members upload get a description (the editor asks for one);
  covers use the game's title.
- New animations are `--animate-*` tokens added to the reduced-motion list in
  `theme.css`; motion driven from JS checks `usePrefersReducedMotion`.
- The app moves focus to `<main>` on navigation and has a skip link; a new
  layout keeps both.

## Performance

- Pages are `lazy()` in `App.tsx`. Heavy popups and editors load when opened
  (`LazyRichTextEditor`, the log editor in `LogFlow`), prefetched with
  `whenIdle` if they're likely.
- The first load is held to the budget in `scripts/bundle-budget.mjs`
  (`npm run size` after a build). A new dependency on the first page needs a
  reason.
- Game art goes through `GameCover` (srcset, lazy, async decoding, never an
  empty `src`) or `igdbSized()` at the size it's shown. Only the one cover
  above the fold gets `priority`.
- Requests whose answer is the same for every visitor pass
  `anonymous: true`, so the CDN can serve them.

## Data

- All data comes through the API: `api/endpoints/*.ts` on `api/client.ts`,
  whose errors are `ApiError`. Never `fetch` the API directly, and never
  query Supabase from the browser: it's for sign-in only.
- Query keys live in `api/queryKeys.ts`, nested so a prefix invalidates the
  family. Hooks live in `hooks/queries/use<Domain>.ts`; mutations invalidate
  by prefix, and optimistic updates roll back from `onMutate`'s snapshot.

## Pages and links

- Each page calls `usePageMeta` with what the server's head says, `noindex`
  included (see the root `CLAUDE.md` for the server side).
- A link written for every reader, like one in the patch notes, uses `/me/...`
  (`/me/lists`, `/me/games?type=wishlist`, `/me?edit=profile`) to reach the
  reader's own profile. Signed out, it asks them to sign up.
- A page that needs an account shows `SignUpPlate` or an `EmptyPlate` with a
  way to sign in, not a silent redirect.

## Errors and the app shell

- Each page renders inside an `ErrorBoundary` keyed to the path, which
  reports to the API and reloads into a new build when a chunk has gone.
  Caught errors that matter go through `reportError`.
- `public/sw.js` never caches the app or its data: only the offline page.
  Push notifications open same-origin links only.
- No `dangerouslySetInnerHTML` or `innerHTML` (lint enforces it). Member text
  renders through React, rich text through `RichTextView`.

## Tests

Tests sit beside the source. `renderWithProviders(ui, { route })` from
`src/test/renderWithProviders.tsx`; the API is MSW (`src/test/msw`), and an
unhandled request fails the test. Coverage thresholds apply to `src/lib`,
`src/hooks` and each page's `lib/`.
