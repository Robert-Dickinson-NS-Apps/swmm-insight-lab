import raw from "./extracted-modules.json";

/**
 * Single source of truth for repository / EPA-runtime provenance shown
 * across the UI and returned from MCP tools. This file exists because
 * the reviewer correctly noted that the app was comparing SWMM5+
 * against EPA SWMM master, while SWMM5+ actually links (via CMake
 * FetchContent in CMakeLists.txt) against EPA SWMM v5.1.13.
 */

export const SWMM5PLUS = {
  repo: "CIMM-ORG/SWMM5plus-1",
  branch: raw.branch as string,
  /** Commit not captured at extraction time — snapshot identity uses `extractedAt` instead. */
  commit: null as string | null,
} as const;

/** EPA SWMM version actually bundled at build time by SWMM5+'s CMakeLists.txt. */
export const EPA_RUNTIME = {
  repo: "USEPA/Stormwater-Management-Model",
  ref: "v5.1.13",
  label: "EPA SWMM 5.1.13 (bundled runtime)",
} as const;

/** Modern EPA SWMM (master) — reference comparison, NOT what SWMM5+ links. */
export const EPA_REFERENCE = {
  repo: "USEPA/Stormwater-Management-Model",
  ref: "master",
  label: "EPA SWMM master (modern reference)",
} as const;

export const EXPLORER_VERSION = "0.3.0";
export const EXTRACTED_AT = raw.generatedAt as string;

export function epaFileUrl(mode: "runtime" | "reference", file: string) {
  const target = mode === "runtime" ? EPA_RUNTIME : EPA_REFERENCE;
  return `https://github.com/${target.repo}/blob/${target.ref}/${file}`;
}
