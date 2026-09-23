# PlayRates

A video game tracker. React + TypeScript (`frontend`), Node + Express
(`backend`), shared types in `shared`, Supabase for data and auth.

```bash
npm run dev         # both servers — frontend :5173, API :3000
npm run typecheck   # all workspaces
npm run test        # vitest, both workspaces
npm run lint -w frontend
```

Typecheck and tests both pass before a change is finished, not after someone
asks.

## Mobile is not an afterthought

Every feature has to _work_ on a phone, not merely reflow onto one. Build the
mobile behaviour alongside the desktop one, in the same change.

- **Overlays are bottom sheets below `sm`.** `ui/Modal` already does this —
  reach for it rather than hand-rolling a dialog.
- **Nothing important sits behind hover.** A touch screen cannot hover, and
  there are no `@media (hover)` queries here. Anything revealed on hover needs
  a standing equivalent below `sm`.
- **44px minimum for anything tappable.** Where the control should stay small
  visually, grow the hit area instead of the glyph:
  `relative before:absolute before:-inset-2 before:content-['']`.
- **Form fields are 16px on a phone** (`text-base sm:text-body-sm`). Below 16px
  iOS Safari zooms the page in on focus and never zooms back out.
- **`dvh`, not `vh`**, for anything sized to the viewport. `vh` measures
  against the viewport with the browser chrome retracted.
- Primary actions go full width on a phone: `w-full sm:w-auto`.
- Check 375px before calling it done. Watch for horizontal overflow: `html`
  sets `overflow-x: hidden`, which hides overflow rather than preventing it, so
  it will not show up in a screenshot — compare `scrollWidth` to `clientWidth`.

## Comments

Comment the _why_. Never the _what_ — if the code already says it, say nothing.

```tsx
// no — narrates the class
// 44px on a phone, tighter from sm
className = "min-h-11 sm:min-h-0";

// yes — records something the code cannot say
// 16px: iOS Safari zooms the page in on a smaller field and never back out.
className = "text-base sm:text-body-sm";
```

Most changes need no comment at all. A line or two where they do. A comment
that restates the diff is worse than none, and a long one is worse still.

## Tests

Pure logic gets a test: reducers, mappers, validators, formatters, and anything
with branches worth naming. Frontend tests sit beside the source
(`lib/pageRange.test.ts`, `components/gamelog/logEditorReducer.test.ts`);
backend unit tests go in `backend/tests/unit/`, route tests in
`backend/tests/routes/`.

Components get a test when they carry behaviour rather than markup — see
`ui/Dropdown.test.tsx` and `ui/Modal.test.tsx`.

Thin wrappers and config do not (`lib/cn.ts`, `lib/env.ts`, `lib/supabase.ts`).

When a bug is fixed, the test that would have caught it goes in with the fix.

## Styling

Tailwind v4, configured entirely in `src/styles/theme.css` — there is no
`tailwind.config`. Use the semantic tokens (`text-content-secondary`,
`bg-surface-raised`, `border-subtle`, `shadow-plate`), never raw palette
values or stock Tailwind colours. Dark is the default and both themes must
work; `/admin/design` renders the component library.

`ui/Button` carries the size scale, including a `touch` size at 48px. Prefer
extending a primitive in `components/ui` over restyling one at the call site.
