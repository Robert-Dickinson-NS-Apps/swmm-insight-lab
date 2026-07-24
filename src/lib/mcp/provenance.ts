import { SWMM5PLUS, EPA_RUNTIME, EPA_REFERENCE, EXTRACTED_AT, EXPLORER_VERSION } from "@/data/provenance";

/**
 * Provenance envelope attached to the `structuredContent` of every MCP
 * tool response. Callers (ChatGPT, Claude, Cursor, …) need to know:
 *   • which SWMM5+ revision the answer describes,
 *   • which EPA SWMM runtime version SWMM5+ actually links against
 *     (v5.1.13, NOT current master),
 *   • when the answer was assembled,
 *   • the explorer version that generated it.
 */
export function buildProvenance() {
  return {
    swmm5plus: {
      repository: SWMM5PLUS.repo,
      ref: SWMM5PLUS.branch,
      commit: SWMM5PLUS.commit,
    },
    epa_runtime: {
      repository: EPA_RUNTIME.repo,
      ref: EPA_RUNTIME.ref,
      note: "This is the EPA SWMM version SWMM5+ actually builds against (CMake FetchContent).",
    },
    epa_reference: {
      repository: EPA_REFERENCE.repo,
      ref: EPA_REFERENCE.ref,
      note: "Modern EPA SWMM for comparison only — NOT what SWMM5+ links.",
    },
    snapshot_extracted_at: EXTRACTED_AT,
    retrieved_at: new Date().toISOString(),
    explorer_version: EXPLORER_VERSION,
  };
}

/** Best-effort SHA-256 hex digest (Web Crypto). Empty string on failure. */
export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  try {
    const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
    const buf = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}
