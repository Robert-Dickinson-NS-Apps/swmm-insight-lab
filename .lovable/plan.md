
# SWMM5plus Repo Explorer

A single-page TanStack Start app that maps the [CIMM-ORG/SWMM5plus-1](https://github.com/CIMM-ORG/SWMM5plus-1) Fortran codebase, links it to Ben Hodges' research papers, and shows a side-by-side mapping to EPA SWMM5 (C) equivalents.

All content is statically curated (no live GitHub fetching). I'll research the repo, the published EPA SWMM5 source layout, and Hodges' papers once via Firecrawl/web search, then bake the data into typed TS files.

## Pages / tabs

Top-level layout: sidebar (collapsible) + main content area. Sidebar lists the four sections; each is its own route for shareable URLs and proper SEO.

1. **`/` — Overview**
   - Project description, key concepts (finite-volume St. Venant solver, parallel coarray Fortran, link-node network).
   - Quick stats: # top-level modules, # source files, primary subsystems.
   - Hero diagram (simplified architecture).

2. **`/tree` — Code tree explorer**
   - Two-pane: left = folder tree of `/SWMM5plus-1` (collapsible), right = description panel for the selected file/folder (purpose, key procedures, related modules).
   - Curated descriptions for every top-level directory and major `.f90` file.

3. **`/architecture` — Architecture & dependency graph**
   - Hand-curated high-level subsystem diagram (Initialization → Network → Hydraulics solver → Hydrology → Output, with shared Utility/Coarray layers) rendered as SVG.
   - Interactive module dependency graph (force-directed) using `react-force-graph-2d`. Nodes = modules grouped by subsystem (color-coded); edges = `use` relationships. Click a node → side panel with module summary + link to its tree entry.

4. **`/papers` — Ben Hodges papers**
   - Curated cards: 6–10 key papers (e.g. Hodges 2019 *Conservative finite-volume forms of the Saint-Venant equations*, Hodges & Liu papers on SWMM5+, CUAHSI / EWRI proceedings).
   - Each card: title, authors, year, venue, DOI/arXiv link, 2–3 sentence summary, and tags showing which subsystem(s) it underpins (links back to `/architecture`).

5. **`/c-alternative` — SWMM5 C side-by-side**
   - Header explains the comparison: SWMM5+ (Fortran, finite-volume, parallel) vs EPA SWMM5 (C, kinematic/dynamic wave, serial).
   - Big table: each row = a SWMM5+ Fortran module/concept; columns = `SWMM5+ (Fortran)` | `EPA SWMM5 (C)` equivalent file/function | Notes on differences (algorithmic, structural, what's missing).
   - Rows grouped by subsystem matching `/architecture`.

## Data model

All curated content lives in `src/data/`:

- `src/data/tree.ts` — recursive `TreeNode` structure mirroring the repo.
- `src/data/modules.ts` — typed list of Fortran modules with `{ id, name, path, subsystem, summary, uses: string[], cEquivalent?: { file, symbol, notes } }`.
- `src/data/papers.ts` — typed list of papers with `{ title, authors, year, venue, url, summary, relatedModules: string[] }`.
- `src/data/subsystems.ts` — color tokens + descriptions for grouping.

## Technical details

- **Stack**: TanStack Start (already scaffolded), Tailwind v4, shadcn components (Sidebar, Card, Tabs, Table, ScrollArea, Badge).
- **Graph**: add `react-force-graph-2d` (lightweight, canvas-based, works in browser only — render inside a client-only wrapper with a loading fallback to avoid SSR issues).
- **Routing**: 5 separate route files under `src/routes/` (`index.tsx`, `tree.tsx`, `architecture.tsx`, `papers.tsx`, `c-alternative.tsx`), each with its own `head()` metadata.
- **Layout**: `__root.tsx` gets a `SidebarProvider` + `AppSidebar` + `<Outlet />`.
- **Design**: muted scholarly palette (deep navy primary, warm sand neutrals, single coral accent for highlights — fits an academic/engineering tool). Serif display font (Instrument Serif) for headings, clean sans (Work Sans) for body. No generic AI-blue.
- **Research step (before coding)**: I'll use Firecrawl to scrape the GitHub repo file tree, Hodges' Google Scholar / ResearchGate page for paper list, and the EPA SWMM source repo (`USEPA/Stormwater-Management-Model`) for the C equivalents.

## Out of scope

- No live GitHub API calls, no auth, no backend.
- No actual source code rendering — descriptions only (with links to GitHub for the real files).
- No editing/notes — read-only explorer.

## Files to create

```
src/data/{tree,modules,papers,subsystems}.ts
src/components/app-sidebar.tsx
src/components/architecture-diagram.tsx
src/components/module-graph.tsx          (client-only force graph)
src/components/tree-explorer.tsx
src/components/paper-card.tsx
src/components/comparison-table.tsx
src/routes/__root.tsx                    (update: add sidebar layout)
src/routes/index.tsx                     (overview)
src/routes/tree.tsx
src/routes/architecture.tsx
src/routes/papers.tsx
src/routes/c-alternative.tsx
```
