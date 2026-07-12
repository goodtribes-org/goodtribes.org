# design-sync notes for goodtribes.org

## Why this repo uses a hand-authored `--entry` override

`goodtribes.org/frontend` is a Next.js App Router application, not a published
component library — there is no `dist/`, no library build, and most files
under `frontend/src/components/` are tightly coupled to the app (Next.js
Server Actions, `next-auth`, Prisma, `next/link`, `next/image`).

Crucially: the converter bundles everything into **one IIFE script**
(`_ds_bundle.js`). Any module in that bundle whose import chain reaches
`@/lib/prisma` throws immediately at script-load time (Prisma's client
detects the browser environment and throws on construction) — which would
break every preview card, not just the offending component's. There is no
supported way to stub/alias those imports (forking `lib/bundle.mjs` is
explicitly discouraged by the skill).

So instead of `cfg.srcDir` + synth-entry (which would `export *` from every
`.tsx` under `frontend/src/components/`, including the risky ones), this repo
uses a hand-written entry file at `.design-sync/entry.mjs` that explicitly
re-exports ONLY the verified-safe components:

```
node .ds-sync/package-build.mjs --config .design-sync/config.json \
  --node-modules frontend/node_modules --entry .design-sync/entry.mjs --out ./ds-bundle
```

**Always pass `--entry .design-sync/entry.mjs` — never rely on synth-entry
auto-discovery for this repo.** `cfg.srcDir` is set to
`frontend/src/components` only so `componentSrcMap`'s enrichment (JSDoc/group)
has a root to resolve from; it is NOT used for entry generation because the
`--entry` flag is always supplied.

## Scope: 11 components

Verified via a transitive import-graph trace (direct-import grepping was not
enough — e.g. `SdgCoverageWidget` looks clean on direct imports but pulls in
`next/image` through `SdgIcon`). Safe set:

`Tooltip`, `StreakBadge`, `KudosButton`, `FileUpload`, `FlagProjectButton`,
`ImpactStatsWidget`, `GanttView`, `NavMenu`, `WorkspaceTabNav`, `CountryMap`,
`ProjectFilters`.

`GanttView` was originally excluded because it imported `updateCard` directly
from the kanban `"use server"` actions file (which imports `@/lib/prisma`
and `next/cache`). Fixed by inverting the dependency: `GanttView` now takes
an `onUpdateCard` callback prop instead of importing the action itself — a
standard container/presentational split, and passing a Server Action as a
prop into a client component is normal, idiomatic Next.js (no runtime
behavior change). Call sites
(`app/projects/[slug]/(workspace)/calendar/page.tsx`,
`components/TasksPage.tsx`) now import `updateCard` themselves and pass it
in. Same pattern is the template for decoupling more components later.

Everything else in `frontend/src/components/` (32 files) still transitively
imports one of: a `"use server"` Server Action file (`@/lib/prisma` and/or
`next/cache`), `@/auth` / `next-auth`, `next/link`, `next/image`, or
`next/navigation` (router hooks need an App Router context this bundle
doesn't have). Adding any of them to `.design-sync/entry.mjs` risks crashing
the whole bundle — re-verify with a transitive trace (not just direct
imports) before adding anything.

### `next/link` empirically confirmed unsafe — fixed for NavMenu/WorkspaceTabNav by removing it

Tested directly (2026-07-10): added a throwaway component that only rendered
`<Link href="/">` from `next/link` to the entry, rebuilt, validated. Result:
**every single component's `window.GoodTribesUI.*` export broke**
(`[BUNDLE_EXPORT] not a component`), with `ReferenceError: process is not
defined` thrown from Next's internals during bundle evaluation — confirming
the single-IIFE blast-radius risk described above empirically, not just
theoretically. There is still no supported shim for this (forking
`lib/bundle.mjs` is discouraged) — the fix applied instead: `NavMenu` and
`WorkspaceTabNav` had every internal `<Link>` replaced with a plain
`<a href>` (accepted trade-off: loses Next's automatic prefetch-on-hover for
these specific nav links; routes still code-split/stream normally on click).
Combined with the same container/presentational split used for `GanttView`
(session/pathname moved to props, real hooks live in
`NavMenuContainer.tsx`/`WorkspaceTabNavContainer.tsx`, which are
intentionally NOT synced). Any *future* component that still needs
`next/link`/`next/image` must get the same `<a>`/`<img>` treatment before it
can be added — re-test with the same throwaway-entry method if in doubt.

### `next/navigation` (`useRouter`) is equally unsafe — same container/callback fix

Confirmed 2026-07-12 when adding `ProjectFilters`: it (and its child
`SortToggle`) called `useRouter()` from `next/navigation` directly and
rendered `next/link`'s `<Link>`. Same fix pattern as above, generalized to
router calls: the presentational component takes an `onNavigate: (url:
string) => void` prop instead of importing the router; a new
`ProjectFiltersContainer.tsx` (and `SortToggleContainer.tsx` for the
home-page standalone usage), both intentionally NOT synced, hold the real
`useRouter()` and pass `onNavigate={(url) => router.push(url)}` down. Unlike
the `<a href>` trade-off above, this loses **nothing** — production still
gets full client-side/soft navigation via the container's real
`router.push`; only the presentational file becomes router-agnostic.
Prefer this callback pattern over the plain-`<a>` fix whenever the component
already needs JS-driven navigation (dropdowns, selects) rather than a bare
link.

### Regression found + fixed 2026-07-12: `NavMenu` had silently drifted back to unsafe

`NavMenu.tsx` was fixed once (2026-07-10, above) but commit `18d8b7a0`
("add PWA support and Swedish/English localization", landed *after* that
fix) reintroduced `next-intl`'s locale-aware `Link` (`import { Link } from
"@/i18n/navigation"`) plus `useTranslations`, unknowingly reverting the
design-sync safety fix — next-intl's navigation wrapper is still built on
`next/link` under the hood, so it re-triggers the exact same
bundle-wide `ReferenceError: process is not defined` crash (confirmed:
validate failed 11/11 components, not just the newly-added ones). **This
class of regression has no automated guard** — a component can look correct
in normal frontend review while silently breaking every synced component's
export. Fixed the same way as `next/navigation` above: `NavMenu.tsx` is now
purely presentational (`onNavigate`, `t`, `tAccount` props, no next-intl/
next imports at all), and `NavMenuContainer.tsx` (not synced) holds the real
`useTranslations`/`useRouter` (from `@/i18n/navigation`) and passes them
down — `router.push` still auto-prefixes the locale exactly as `Link` did,
so this is a zero-regression fix, not the `<a>` trade-off.
**Whoever touches `NavMenu.tsx` or `WorkspaceTabNav.tsx` next must keep them
free of `next/link`, `@/i18n/navigation`, `next/navigation`, and
`next-intl` hooks — route real navigation/i18n through their `*Container.tsx`
instead.** Re-verify with a full rebuild + validate after any edit to either
file, even a seemingly unrelated one.

### `CountryMap`: swapped the runtime GEO_URL fetch for a bundled import

`CountryMap.tsx` originally fetched world-atlas topojson at runtime from a
root-relative URL (`fetch("/geo/countries-110m.json")`, via
`react-simple-maps`'s `<Geographies geography={url}>`). That resolves fine
on the real site (same-origin), but inside the design-sync preview (served
from wherever `ds-bundle`/claude.ai hosts it) the root-relative path 404s —
confirmed empirically: both preview variants rendered as an empty bordered
box, and validate flagged `[RENDER_THIN] variants render identically`
because no countries ever painted. Fixed by importing the topojson file
directly (`import worldAtlas from "../../public/geo/countries-110m.json"`,
`resolveJsonModule` was already on) and passing the parsed object straight
to `<Geographies geography={worldAtlas}>` — `react-simple-maps` skips its
internal fetch whenever `geography` isn't a string (see
`useGeographies` in `react-simple-maps/dist/index.js`), so this removes the
network dependency entirely rather than working around it. Verified this
doesn't regress the real site (screenshotted `/sv/projects` before and
after — identical render, same Sweden highlight). Trade-off: the ~108KB
topojson now ships inside whatever JS chunk includes `CountryMap` instead of
being fetched lazily — acceptable, and arguably better (no network
round-trip, works offline-cached). **Re-sync risk**: if
`frontend/public/geo/countries-110m.json` is ever regenerated/replaced, the
bundled copy goes stale until the next design-sync rebuild — there's no
automatic re-check tying the two together.

## CSS: compiled Tailwind output, not the raw source

`cfg.cssEntry` points at `.design-sync/.cache/compiled-globals.css`, NOT
`frontend/src/app/globals.css` directly. Tailwind v4 needs its
`@tailwindcss/postcss` build step to turn `@theme` tokens + utility classes
actually used in the source into real CSS — the raw `globals.css` just
contains `@import "tailwindcss";`, which the converter can't resolve
(`[CSS_IMPORT_MISSING]`).

Regenerate before every build with:

```
cd frontend && node -e "
import('postcss').then(async ({default: postcss}) => {
  const tailwindcss = (await import('@tailwindcss/postcss')).default;
  const { readFileSync, writeFileSync } = await import('node:fs');
  const css = readFileSync('./src/app/globals.css', 'utf8');
  const result = await postcss([tailwindcss()]).process(css, { from: './src/app/globals.css' });
  writeFileSync('../.design-sync/.cache/compiled-globals.css', result.css);
});
"
```
(Written as a temp `.mjs` file inside `frontend/` when actually run, so
Node's ESM resolution finds `postcss`/`@tailwindcss/postcss` in
`frontend/node_modules` — a script outside `frontend/` fails to resolve
them.) This scans the whole frontend project for used classes (not just the
6 synced components), so it's larger than strictly necessary but always
correct and deterministic from source.

## Known render warns

- `KudosButton`: `WithoutProject` variant renders identical to `Default`
  ([RENDER_THIN] "variants render identically" is expected). The prop
  difference (`toUserName`, `projectId`) is only visible inside the popover,
  which opens on click and can't be captured in a static render. Triaged as
  benign — not a bug.
- `Tooltip`, `KudosButton`, `FlagProjectButton`, `NavMenu`: all show only
  their closed/idle visual state. The hover-revealed tooltip bubble and the
  click-opened popovers/dropdowns/drawers can't be forced open via props —
  no prop exists to control that internal state, and per the skill's rules
  previews must compose the real component, never a reimplementation.
  Accepted as the correct scope for a props-driven preview of these
  components. For `NavMenu` specifically this also means the `LoggedIn`/
  `LoggedOut` preview variants render identically ([RENDER_THIN] "variants
  render identically") — the session-dependent items only show inside the
  closed dropdown/drawer.

## Re-sync risks

- If a future re-sync widens scope, re-verify each new candidate's full
  transitive import closure for `@/lib/prisma`, `@/auth`, `next-auth`,
  `next/cache`, `next/link`, `next/image`, `next/navigation`, and any
  `"use server"` file. A component can look clean on a direct-import grep
  and still be unsafe.
- If a candidate is presentational but its file also exports non-visual
  helpers (types, server actions) from the same module, that's fine — only
  the *import graph reachable from the default/named export we re-export*
  matters, but esbuild bundles the whole file (and everything it imports) at
  the module level, not just the referenced binding, so any top-level import
  in that file's siblings still ships.
- Growing this design system likely requires the app team to extract
  presentational, Prisma-free versions of components (props-only, no
  server-action imports) — worth a note back to the team rather than fighting
  the coupling from the sync side.
- `frontend/tsconfig.json`'s `@/*` path alias is configured in
  `.design-sync/config.json` (`tsconfig`) but none of the 6 v1 components
  actually use `@/` imports — harmless if unused, but stays as a forward
  compat setting in case a future addition needs it.
- **Already-synced components can silently regress**, not just new
  candidates — see the `NavMenu` regression entry above. Unrelated feature
  work (i18n, routing changes) can reintroduce an unsafe import into a
  component that was already fixed once, and nothing outside a design-sync
  rebuild catches it (normal `tsc`/lint/tests all pass fine). If a future
  re-sync's validate suddenly fails ALL components at once instead of just
  the ones being added, suspect drift in one of the *existing* 11, not the
  new candidate — bisect by temporarily removing existing components from
  `entry.mjs` one at a time (or use `git log -- <file>` on each synced
  component since the last successful sync) rather than assuming the new
  addition is at fault.
- `ProjectFilters`/`SortToggle`/`NavMenu` all depend on their `*Container.tsx`
  wrapper (not synced) to supply `onNavigate`/`t`/`tAccount` — if one of
  these presentational files is edited to add a feature that needs new
  container-provided data, the container, its prop type, and every preview
  in `.design-sync/previews/<Name>.tsx` all need updating together.
- `CountryMap` now statically imports `frontend/public/geo/countries-110m.json`
  instead of fetching it — see the dedicated entry above. A rebuild is
  required if that file is ever replaced.
