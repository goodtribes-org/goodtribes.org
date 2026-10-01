# Self-hosted fonts

Every font the site uses is bundled here and loaded with `next/font/local`
(`src/lib/fonts.ts`, `src/components/ny-startsida/fonts.ts`) instead of
`next/font/google`. With `next/font/google` the Docker build fetched the fonts
from Google at build time, and that fetch intermittently failed in CI
(`An error occurred in next/font … Cannot read properties of null`). That
failure had nothing to do with the code being built, so every PR needed a
re-run. Now the build never talks to Google.

The files are the **latin** subset (the same `subsets: ["latin"]` as before:
covers å ä ö), as served by Google Fonts' CSS API on 2026-09-30. Variable
fonts are kept variable, and Bricolage Grotesque keeps its `opsz` axis.

| File | Family | Weights | License |
|---|---|---|---|
| `Inter-latin.woff2` | Inter | 400–800 (variable) | `Inter-OFL.txt` |
| `Kalam-latin.woff2` | Kalam | 400 | `Kalam-OFL.txt` |
| `JetBrainsMono-latin.woff2` | JetBrains Mono | 400–500 (variable) | `JetBrainsMono-OFL.txt` |
| `BricolageGrotesque-latin.woff2` | Bricolage Grotesque | 200–800, opsz 12–96 (variable) | `BricolageGrotesque-OFL.txt` |
| `Figtree-latin.woff2` | Figtree | 400–700 (variable) | `Figtree-OFL.txt` |
| `Satisfy-latin.woff2` | Satisfy | 400 | `Satisfy-LICENSE.txt` (Apache 2.0) |

All but Satisfy are under the SIL Open Font License 1.1; Satisfy is under
the Apache License 2.0. Both allow bundling and serving them. The license
must travel with the files, so keep the matching `*-OFL.txt` /
`*-LICENSE.txt` next to each font.

To add a font: download its woff2 from the Google Fonts CSS API
(`https://fonts.googleapis.com/css2?family=…`, latin block), add its license file
from `github.com/google/fonts/tree/main/<ofl|apache>/<family>`, and declare it with
`localFont` next to the others.
