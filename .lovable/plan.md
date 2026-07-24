# Accuracy & Provenance Pass

This is a scoped implementation of the review's **P0 items** (facts/trust). P1/P2 items (real Fortran parsing, coverage metrics, DOI validation, diff views) are out of scope here — call them out as follow-ups.

## 1. EPA runtime version pinning (5.1.13, not master)

- Add a single source of truth `src/data/provenance.ts` exporting:
  - `SWMM5PLUS = { repo: "CIMM-ORG/SWMM5plus-1", branch: "development", commit: <from extracted-modules.json if present, else null> }`
  - `EPA_RUNTIME = { repo: "USEPA/Stormwater-Management-Model", ref: "v5.1.13" }` (what SWMM5+ actually links via CMake FetchContent)
  - `EPA_REFERENCE = { repo: "USEPA/Stormwater-Management-Model", ref: "master" }` (optional modern comparison)
  - `EXPLORER_GENERATED_AT` from the extraction timestamp
- Rewrite `src/routes/c-alternative.tsx`:
  - Change `EPA` base URL to build from `EPA_RUNTIME` (v5.1.13), not master.
  - Add a mode toggle: **Runtime (5.1.13)** ↔ **Modern (master)**. Links + notes swap.
  - Render a provenance strip at top: repo, branch, commit, EPA ref, generated-at.
- Add the same provenance strip to `index.tsx`, `architecture.tsx`, `tree.tsx`, `papers.tsx`, `c-translation.tsx` via a small shared `<ProvenanceBar />` component.

## 2. Correct C-equivalent mappings

In `src/data/modules.ts`, rework `cEquivalent` entries:

- Replace freeform `notes` with a controlled `relation` field: `"direct-port" | "functional-analogue" | "centralized-equivalent" | "shared-concept" | "wrapper" | "extension" | "new-in-swmm5plus"`, plus a `confidence: "high" | "medium" | "low"` and `reviewed: boolean` (default false).
- Fix the geometry rows currently marked "no equivalent" — filled circular, mod-basket, parabolic, power-function, rect-round, rect-triangular — to point at `src/solver/xsect.c` with relation `centralized-equivalent`.
- Update the C-alternative table columns: **SWMM5+ Fortran | EPA SWMM (C) | Relation | Confidence | Notes**. Color-code relation.

## 3. Reframe "serial" and "fixed timestep" claims

- In `c-alternative.tsx` intro copy and any per-row notes, replace:
  - "EPA SWMM is serial" → "EPA SWMM does not implement distributed / coarray SPMD partitioning; its dynamic-wave solver uses shared-memory OpenMP across links."
  - "Fixed vs adaptive timestep" → "EPA SWMM: implicit iterative dynamic-wave with optional variable step (Courant factor). SWMM5+: explicit FV RK2 with CFL-constrained adaptive step."
- Same corrections in `index.tsx` overview blurb if present.

## 4. Module count consistency

- Homepage (`index.tsx`) and `c-translation.tsx`: change "72 modules" to `"{N} source units — {N-1} modules + 1 main program"` sourced from `AUTO_MODULES` length + a hardcoded main-program adjustment. Verify the actual count from `extracted-modules.json` before wiring.

## 5. Paper attribution

- In `src/data/papers.ts`, expand the "Introducing SWMM5+" entry authors to include Sharior, Tiernan, Jenkins, Riaño-Briceño, Davila-Hernandez, Madadi-Kandjani, Yu (verify list against DOI 10.1061/JOEEDU.EEENG-7680 before saving).
- Add an `evidenceLevel` field per paper: `"implementation-source" | "direct-basis" | "author-cited-context" | "explorer-inference"` with a legend on `/papers`.
- Add a prominent research-status banner on `/papers` and `/` quoting the 2024 intro paper's beta / testing caveat.

## 6. Reframe the C translator

- Rename the `/c-translation` page heading to **"C Port Planning Scaffold"** and update sidebar label.
- Prepend a plain-language disclaimer: file names, include guards, dependency includes, and empty `init/step/finalize` stubs are generated — no procedures, types, coarrays, or numerics are translated.
- Add a static **Translation coverage** panel: `Files scaffolded: N`, `Procedures translated: 0`, `Types translated: 0`, `Numerical kernels translated: 0`, `Behavioral tests passing: 0`.
- Leave `src/lib/c-skeleton.ts` / `vs-solution.ts` code paths unchanged.

## 7. MCP provenance in every response

- Add a shared `buildProvenance()` helper in `src/lib/mcp/provenance.ts` returning `{ repository, ref, commit, retrieved_at, explorer_version }`.
- Include it in `structuredContent` for every tool in `src/lib/mcp/tools/*.ts` (list-modules, get-module, search-modules, list-papers, get-paper, fetch-module-source, download-module-bundle). No new tools; no schema-breaking changes.
- `fetch_module_source` + `download_module_bundle` additionally include `content_sha256` (compute via `crypto.subtle.digest`).
- After edits, run `app_mcp_server--extract_mcp_manifest` to refresh `.lovable/mcp/manifest.json`.

## 8. Out of scope (call out to user)

- Live Fortran AST parsing / real procedure signatures / call graphs
- Test coverage integration
- DOI-driven paper metadata validation
- Nightly re-extraction job & repo-diff view
- Fixing the reported Architecture-route 500 (needs repro; likely crawler-specific per review)

## Files touched

- New: `src/data/provenance.ts`, `src/components/provenance-bar.tsx`, `src/lib/mcp/provenance.ts`
- Edit: `src/data/modules.ts`, `src/data/papers.ts`, `src/routes/{index,c-alternative,c-translation,papers,architecture,tree}.tsx`, `src/components/app-sidebar.tsx`, all 7 files under `src/lib/mcp/tools/`

Confirm and I'll implement, or tell me which sections to drop / prioritize.
