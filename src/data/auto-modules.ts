import raw from "./extracted-modules.json";
import { MODULES_BY_ID } from "./modules";
import type { SubsystemId } from "./subsystems";

export const GITHUB_REPO = "CIMM-ORG/SWMM5plus";
export const GITHUB_BRANCH = raw.branch;
export const EXTRACTED_AT = raw.generatedAt;
export const EXPORT_SCHEMA_VERSION = 1;

export const EXTRACTOR_SETTINGS = {
  fileGlob: "**/*.f90",
  scannedDirs: [
    "initialization", "interface", "geometry", "special_elements",
    "timeloop", "definitions", "utility", "main",
  ],
  moduleDeclRegex: "/^\\s*module\\s+(\\w+)/i",
  useStmtRegex: "/^\\s*use\\s+(\\w+)(?:\\s*,\\s*only\\s*:([^!]*))?/i",
  commentStripChar: "!",
  caseFolding: "lowercase-module-ids",
} as const;

export function githubFileUrl(path: string, line?: number) {
  const base = `https://github.com/${GITHUB_REPO}/blob/${GITHUB_BRANCH}/${path}`;
  return line ? `${base}#L${line}` : base;
}

export function rawFileUrl(path: string) {
  return `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
}

export interface UseEdge {
  /** Target module id (lowercased name) */
  name: string;
  /** 1-based line number of the `use` statement in the source file */
  line: number;
  /** Verbatim trimmed source line that introduced the dependency */
  source: string;
  /** `only:` clause, if present */
  only: string | null;
}

export interface AutoModule {
  id: string;
  name: string;
  path: string;
  /** 1-based line of the `module <name>` declaration */
  declaredLine: number;
  subsystem: SubsystemId;
  /** Names only — kept for back-compat with graph/list rendering */
  uses: string[];
  /** Full extraction detail per `use` statement */
  useDetails: UseEdge[];
  summary?: string;
}

function subsystemFor(path: string): SubsystemId {
  const dir = path.split("/")[0];
  switch (dir) {
    case "initialization":   return "init";
    case "interface":        return "interface";
    case "geometry":         return "network";
    case "special_elements": return "hydraulics";
    case "timeloop":         return "hydraulics";
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

interface RawUse { name: string; line: number; source: string; only: string | null }
interface RawNode { name: string; path: string; line: number; uses: RawUse[] }
const nodes: RawNode[] = raw.nodes as RawNode[];

export const AUTO_MODULES: AutoModule[] = nodes.map((n) => {
  const id = n.name;
  const curated = MODULES_BY_ID[id];
  return {
    id,
    name: n.name,
    path: n.path,
    declaredLine: n.line,
    subsystem: PATH_OVERRIDES[n.path] ?? subsystemFor(n.path),
    uses: n.uses.map((u) => u.name),
    useDetails: n.uses,
    summary: curated?.summary,
  };
});

export const AUTO_MODULES_BY_ID: Record<string, AutoModule> = Object.fromEntries(
  AUTO_MODULES.map((m) => [m.id, m]),
);

export const EDGE_COUNT = AUTO_MODULES.reduce((s, m) => s + m.uses.length, 0);
