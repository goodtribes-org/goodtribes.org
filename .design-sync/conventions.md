## GoodTribes design conventions

No provider or root wrapper is required. None of the synced components read
from React context, theme, or session — they're plain props-in,
JSX-out — so you can drop any of them straight into a page with no setup.

### Styling idiom: Tailwind v4 utility classes + brand color tokens

Style with Tailwind utility classes directly on elements — this codebase
does not use CSS modules, styled-components, or a prop-based style API.
Brand colors are defined as Tailwind v4 `@theme` tokens (in
`styles.css`/`_ds_bundle.css`) and used via the matching utility classes:

| Token | Hex | Utility classes |
|---|---|---|
| `--color-coral` | `#ff6f59` | `bg-coral`, `text-coral`, `border-coral` |
| `--color-dark-slate` | `#254441` | `bg-dark-slate`, `text-dark-slate` (primary text color) |
| `--color-seagrass` | `#43aa8b` | `bg-seagrass`, `text-seagrass` (primary accent / success) |
| `--color-muted-teal` | `#7bad93` | `border-muted-teal`, `bg-muted-teal` |
| `--color-dry-sage` | `#b2b09b` | `bg-dry-sage` |
| `--color-watermelon` | `#ef3054` | `bg-watermelon`, `text-watermelon` (error / destructive) |

Combine with opacity modifiers freely, matching the source's own idiom —
e.g. `text-dark-slate/50`, `border-muted-teal/40`, `bg-coral/10`. Standard
Tailwind utilities (spacing, `rounded-*`, `shadow-*`, `flex`, `grid`, etc.)
are all available and used throughout — this is a normal Tailwind v4
project, just with these six brand colors layered on top of the default
palette.

Text content in this app is Swedish (no i18n layer) — when composing new
UI in this style, prefer Swedish microcopy to match (e.g. "Spara", "Avbryt",
"Skicka") rather than English, unless the user asks otherwise.

### Where the truth lives

- `styles.css` → `@import`s `_ds_bundle.css`, which holds the real compiled
  Tailwind output (tokens + every utility class the synced components use).
  Read it before styling anything to confirm a class/token actually exists.
- Each component's `<Name>.prompt.md` documents its actual props.

### Example

```tsx
import { StreakBadge, ImpactStatsWidget } from "goodtribes-frontend";

function Sidebar() {
  return (
    <div className="flex flex-col gap-3 border border-muted-teal/30 rounded-xl p-4">
      <StreakBadge currentWeeks={4} longestWeeks={9} />
      <ImpactStatsWidget totalRaised={128500} totalHours={942} completedTasks={317} />
    </div>
  );
}
```
