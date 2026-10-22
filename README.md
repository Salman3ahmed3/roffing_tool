# [BRAND] calculators

Static Astro site: roofing, fence and deck calculators. Built from `Calculator Site Design` (deep-blue accent).

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies (Node ≥ 22.22) |
| `npm run dev` | Dev server at http://localhost:4321 |
| `npm test` | Vitest — every formula in `src/lib/calc/` |
| `npm run build` | Type-check (`astro check`) then build to `dist/` |
| `npm run preview` | Serve the built site |

## Environment (`.env`, see `.env.example`)

| Variable | Purpose |
| --- | --- |
| `PUBLIC_SITE_URL` | Production origin. Used for canonicals, Open Graph, sitemap and robots.txt. |
| `PUBLIC_ADSENSE_CLIENT` | `ca-pub-…`. While empty, **no ad code and no ad space** is rendered. |
| `PUBLIC_ADSENSE_SLOT_SIDEBAR` / `_BELOW_TOOL` / `_IN_CONTENT` | Ad-unit IDs per placement. A placement without an ID is not rendered. |
| `PUBLIC_AD_PLACEHOLDERS` | `true` shows dashed boxes where ads go (layout review only; ignored once a client ID is set). |

## Where things live

- `src/lib/calc/` — pure formula functions (no DOM). Tests in `tests/`.
- `src/lib/url-state/` — shareable URL ⇄ input state.
- `src/components/tools/` — calculator UI blocks; behaviour in `src/scripts/`.
- `src/components/AdSlot.astro` — fixed-size ad slots (no layout shift).
- `src/config/site.ts` — brand, author/reviewer placeholders, feature flags (`showCostCard`, `showQuotesCta` are off).
- `src/styles/tokens.css` — design tokens as CSS custom properties.

## Placeholders to replace before launch

`[BRAND]`, `[Author name]`, `[Reviewer name]`, `[Review date]`, `[contact@brand.com]` — all in `src/config/site.ts`.
