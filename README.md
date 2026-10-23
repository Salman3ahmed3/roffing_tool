# ExteriorMath calculators

Static Astro site: roofing, fence and deck calculators. Built from `Calculator Site Design` (deep-blue accent).

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies (Node ≥ 22.22) |
| `npm run dev` | Dev server at http://localhost:4321 |
| `npm test` | Vitest — every formula in `src/lib/calc/` |
| `npm run build` | Run the tests, type-check (`astro check`), then build to `dist/` |
| `npm run preview` | Serve the built site |

## Environment (`.env`, see `.env.example`)

| Variable | Purpose |
| --- | --- |
| `PUBLIC_ADSENSE_CLIENT` | `ca-pub-…`. While empty, **no ad code and no ad space** is rendered. |
| `PUBLIC_ADSENSE_SLOT_SIDEBAR` / `_BELOW_TOOL` / `_IN_CONTENT` | Ad-unit IDs per placement. A placement without an ID is not rendered. |
| `PUBLIC_AD_PLACEHOLDERS` | `true` shows dashed boxes where ads go (layout review only; ignored once a client ID is set). |

## Pages

| Route | What it is |
| --- | --- |
| `/` | Homepage with the compact roof pitch calculator |
| `/roof-pitch-calculator/` | Rise & run / angle / pitch, ft-in or metric, live diagram |
| `/roofing-calculator/` | Squares, bundles, underlayment, drip edge (`?pitch=` carries over from the pitch tool) |
| `/fence-calculator/` | Posts, rails, pickets, concrete bags |
| `/deck-calculator/` | Boards, joists, rim joists, screws |
| `/guides/[slug]/` | Guide template; articles are MDX files in `src/content/guides/` |
| `/about/` `/contact/` `/privacy/` `/terms/` `/methodology/` | Content pages |

### Adding a guide

Create `src/content/guides/<slug>.mdx` with the frontmatter used by `how-to-measure-roof-pitch.mdx`.
`<PitchMini variant="inline" />` embeds the calculator; place at most one `<AdSlot placement="inContent" />`, well after it.

## Where things live

- `src/lib/calc/` — pure formula functions (no DOM). Tests in `tests/`.
- `src/lib/tools/` — per-tool validation, unit conversion and display (pure, tested).
- `src/lib/url-state/` — shareable URL ⇄ input state.
- `src/components/tools/` — calculator UI blocks; behaviour in `src/scripts/`.
- `src/components/AdSlot.astro` — fixed-size ad slots (no layout shift).
- `src/config/site.ts` — brand, author/reviewer placeholders, feature flags (`showCostCard`, `showQuotesCta` are off).
- `src/styles/tokens.css` — design tokens as CSS custom properties.

## Placeholders to replace before launch

`[Author name]`, `[Reviewer name]`, `[Review date]` and the reviewer credential — all in `src/config/site.ts`.

Legal pages contain bracketed placeholders (`[Effective date]`, `[Company legal name]`, `[Jurisdiction]`, hosting and consent details) and should be reviewed by a professional before launch.

## Feature flags (`src/config/site.ts`)

- `showCostCard: false` — the installed-cost card on the roofing page. It also needs real `low` / `typical` / `high` figures passed to `<CostCard>`; no example prices ship.
- `showQuotesCta: false` — the "Get 3 quotes" button. When switched on it renders disabled until an `href` is supplied.
