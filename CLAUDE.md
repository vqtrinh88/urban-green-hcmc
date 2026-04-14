# CLAUDE.md — UrbanGreen HCMC

Context for AI assistants (Claude, etc.) working in this repository.

## What this is

Single-page **Vue 3 + Vite** dashboard for **urban canopy / ESG-style metrics** along an HCMC corridor (per BRD). The UI is largely **Vietnamese**; mock tree inventory and domain enums (`health`, `riskRating`, species keys) stay **English in data** and are mapped for display via `src/utils/viLabels.js`.

## Stack

| Layer | Choice |
|--------|--------|
| UI | Vue 3 (`<script setup>`), Pinia |
| Build | Vite 8, `@vitejs/plugin-vue` |
| Map | Mapbox GL JS — 2D circles + hit layer; **3D** custom layer (Three.js `InstancedMesh`-style tree preview on map) |
| Charts | Chart.js + vue-chartjs (health doughnut in left panel) |
| Language | **JavaScript** (no TypeScript); JSDoc in places |

**Node:** `engines.node` is **>= 22**. Vite 8 fails on older Node (e.g. 16). Use `nvm use 22` before `npm run dev` / `npm run build`.

## Commands

```bash
nvm use 22          # recommended
cp .env.example .env
npm install
npm run dev         # Vite dev server
npm run build       # production bundle → dist/
npm run preview     # serve dist
```

Restart dev after changing `.env` so `import.meta.env.VITE_*` reloads.

## Environment variables

| Variable | Role |
|----------|------|
| `VITE_MAPBOX_ACCESS_TOKEN` | **Required** for map tiles/layers. Missing token → inline error in map panel (Vietnamese message). |
| `VITE_OPENWEATHER_API_KEY` or `VITE_OPENWEATHER_KEY` | Optional; mock weather when empty or on fetch error. |
| `VITE_OPENWEATHER_LAT` / `VITE_OPENWEATHER_LON` | Optional centroid for weather (defaults align with BRD corridor). |

See `.env.example` for comments.

## Repository layout

```
src/
  App.vue                 # mounts DashboardShell only
  main.js                 # createApp + Pinia + global.css
  layout/
    DashboardShell.vue    # header, 20/60/20 grid, collapsible side panels, map resize hooks
  components/
    LeftPanel.vue         # KPIs + health chart (bounds-filtered aggregates)
    MapPanel.vue          # Mapbox init, bounds sync, 2d/3d mode, tree popup HTML + global popup CSS
    RightPanel.vue        # clock, weather, wind banner, priority list, selected tree detail
  stores/
    dashboard.js          # Pinia store: bounds, mapMode, selection, wind, treeCollection ref
  composables/
    useClock.js           # live clock; date/time locale vi-VN
    useWeather.js         # OpenWeather + mock fallback; sets store wind speed
  utils/
    mockTrees.js          # MOCK_TREE_COLLECTION GeoJSON, corridor geometry, deterministic RNG
    aggregateByBounds.js  # filter/aggregate/priority chips/wind-risk helper
    ecosystemMath.js      # AGB, CO₂, O₂ from biometrics + species profiles
    viLabels.js           # HEALTH_VI, RISK_VI, priority chip strings, chart legend VI
  data/
    speciesProfiles.js    # species parameters for ecosystem math
  map/
    treeLayer2d.js        # GeoJSON source, circle + hit layers
    buildingExtrusions.js
    treeMeshLayer.js      # Mapbox custom layer + Three renderer
    popupTreePreview.js   # Three canvas inside map popup
  styles/
    global.css            # CSS variables, buttons, layout tokens
markdown/
  UG_BRD.md, UG_Demo.md   # product / demo notes (not wired into build)
```

Path alias: **`@/` → `src/`** (`vite.config.js`, `jsconfig.json`).

## Data flow (mental model)

1. **`MOCK_TREE_COLLECTION`** (from `mockTrees.js`) is the single inventory; the store exposes it as `treeCollection` (today a constant reference, not yet wired to APIs).
2. **`MapPanel`** updates **`mapBounds`** on map `moveend` / `zoomend` → store **`treesInBounds`** and **`aggregates`** (left panel).
3. **`priorityList`** is computed from the **full** collection (not clipped to bounds); **`showWindBanner`** combines **in-bounds** trees with **wind speed** from weather.
4. **Selection:** map click or list → **`selectTree(assetId)`** → **`RightPanel`** detail view; header “Bỏ chọn cây” clears.
5. **`registerMapResize` / `requestMapResize`:** shell calls resize after panel toggle so Mapbox fills the stage.

## Domain conventions

- **GeoJSON:** `Point` features; `properties.assetId` is the stable id for selection and popups.
- **Health / risk** strings in JSON are **English** (`Excellent`, `High`, …). UI strings use **`healthVi()` / `riskVi()`** from `viLabels.js`; priority tag text uses **`PRIORITY_CHIP_VI`** in `aggregateByBounds.js`.
- **Number formatting:** KPI / tonnes formatters in panels use **`toLocaleString('en-US', …)`** (comma thousands, dot decimals) where `fmt` / `fmtTonnes` exist.

## Map modes

- **2d:** circle fill for trees, building extrusion layer off.
- **3d:** pitched camera, extruded buildings (if style supports), **mesh layer** replaces visible circles; hit layer stays for clicks.

Popup content is built as HTML strings in **`MapPanel.vue`** (`treePopupHtml`); styles for `.mapboxgl-popup` and `.ug-popup*` live in the **unscoped** `<style>` block there (Mapbox moves nodes outside Vue scope).

## Product docs

- **`markdown/UG_BRD.md`** — corridor, metrics, narrative requirements.
- **`README.md`** — human setup and scripts.

## Lint / tests

No ESLint/Prettier config or `npm test` script in-repo. Verify with **`npm run build`**.

## Change discipline

- Keep diffs focused; match existing Vue/Pinia patterns and Vietnamese copy style when touching UI text.
- Do not commit real API keys; use `.env` (gitignored) locally.


## Behavioral guidelines to reduce common LLM coding mistakes

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
