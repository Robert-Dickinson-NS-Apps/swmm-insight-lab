import raw from "./extracted-modules.json";
import { MODULES_BY_ID } from "./modules";
import type { SubsystemId } from "./subsystems";

export const GITHUB_REPO = "CIMM-ORG/SWMM5plus";
export const GITHUB_BRANCH = raw.branch;
export const EXTRACTED_AT = raw.generatedAt;

export function githubFileUrl(path: string) {
  return `https://github.com/${GITHUB_REPO}/blob/${GITHUB_BRANCH}/${path}`;
}

export interface AutoModule {
  id: string;
  name: string;
  path: string;
  subsystem: SubsystemId;
  uses: string[];
  /** Optional curated summary if we have one for this module id */
  summary?: string;
}

/** Map a file path prefix to a subsystem id. */
function subsystemFor(path: string): SubsystemId {
  const dir = path.split("/")[0];
  switch (dir) {
    case "initialization":   return "init";
    case "interface":        return "interface";
    case "geometry":         return "network";
    case "special_elements": return "hydraulics";
    case "timeloop":         return "hydraulics"; // most files are solver; timeloop.f90 itself is overridden
    case "definitions":      return "utility";
    case "utility":          return "utility";
    case "main":             return "output";
    default:                 return "utility";
  }
}

const PATH_OVERRIDES: Record<string, SubsystemId> = {
  "timeloop/timeloop.f90": "timeloop",
  "main/main.f90": "init",
  "main/finalization.f90": "output",
  "main/output.f90": "output",
  "definitions/define_xsect_tables.f90": "network",
};

interface Raw { name: string; path: string; uses: string[] }
const nodes: Raw[] = raw.nodes;

export const AUTO_MODULES: AutoModule[] = nodes.map((n) => {
  const id = n.name;
  const curated = MODULES_BY_ID[id];
  return {
    id,
    name: n.name,
    path: n.path,
    subsystem: PATH_OVERRIDES[n.path] ?? subsystemFor(n.path),
    uses: n.uses,
    summary: curated?.summary,
  };
});

export const AUTO_MODULES_BY_ID: Record<string, AutoModule> = Object.fromEntries(
  AUTO_MODULES.map((m) => [m.id, m]),
);

export const EDGE_COUNT = AUTO_MODULES.reduce((s, m) => s + m.uses.length, 0);
