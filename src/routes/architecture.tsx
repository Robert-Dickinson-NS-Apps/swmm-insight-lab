import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SUBSYSTEMS, SUBSYSTEM_BY_ID, type SubsystemId } from "@/data/subsystems";
import { MODULES, MODULES_BY_ID } from "@/data/modules";
import {
  AUTO_MODULES, AUTO_MODULES_BY_ID, EDGE_COUNT, EXTRACTED_AT,
  EXPORT_SCHEMA_VERSION, EXTRACTOR_SETTINGS,
  GITHUB_REPO, GITHUB_BRANCH, githubFileUrl,
  type AutoModule, type UseEdge,
} from "@/data/auto-modules";
import type { GraphSource } from "@/components/module-graph";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ExternalLink, Download, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ModuleGraph = lazy(() => import("@/components/module-graph"));

interface ExportMeta {
  schemaVersion: number;
  generatedAt: string;
  extractedAt: string;
  repo: string;
  branch: string;
  extractorSettings: typeof EXTRACTOR_SETTINGS;
  filter?: { subsystems: SubsystemId[] | "all"; query: string };
}

function buildMeta(filter?: ExportMeta["filter"]): ExportMeta {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    extractedAt: EXTRACTED_AT,
    repo: GITHUB_REPO,
    branch: GITHUB_BRANCH,
    extractorSettings: EXTRACTOR_SETTINGS,
    ...(filter ? { filter } : {}),
  };
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(filename: string, rows: string[][], meta: ExportMeta) {
  const escape = (cell: string) => /[",\n]/.test(cell) ? `"${cell.replace(/"/g, "\"\"")}"` : cell;
  const metaLine = `# ${JSON.stringify(meta)}`;
  const csv = metaLine + "\n" + rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

interface DiagPayload {
  meta: ExportMeta;
  stats: { filesScanned: number; modulesDeclared: number; useEdges: number; unresolvedTargets: number };
  modules: AutoModule[];
  unresolved: { sourceModule: string; sourcePath: string; targetModule: string; line: number; only: string | null; source: string }[];
}

function buildExportPayload(modules: AutoModule[], filter?: ExportMeta["filter"]): DiagPayload {
  const ids = new Set(modules.map((m) => m.id));
  const unresolved = modules.flatMap((m) =>
    m.useDetails.filter((e) => !ids.has(e.name)).map((e) => ({
      sourceModule: m.name, sourcePath: m.path, targetModule: e.name,
      line: e.line, only: e.only, source: e.source,
    }))
  );
  const edges = modules.reduce((s, m) => s + m.useDetails.length, 0);
  return {
    meta: buildMeta(filter),
    stats: {
      filesScanned: modules.length, modulesDeclared: modules.length,
      useEdges: edges, unresolvedTargets: unresolved.length,
    },
    modules,
    unresolved,
  };
}

function buildExportCsvRows(modules: AutoModule[]): string[][] {
  const rows: string[][] = [
    ["source_module", "source_path", "target_module", "line", "only_clause", "source_text", "resolved"],
  ];
  const ids = new Set(modules.map((m) => m.id));
  for (const m of modules) {
    for (const e of m.useDetails) {
      rows.push([m.name, m.path, e.name, String(e.line), e.only ?? "", e.source, ids.has(e.name) ? "yes" : "no"]);
    }
  }
  return rows;
}

const useEdgeSchema = z.object({
  name: z.string(), line: z.number(), source: z.string(), only: z.string().nullable(),
});
const autoModuleSchema = z.object({
  id: z.string(), name: z.string(), path: z.string(),
  declaredLine: z.number(),
  subsystem: z.string(),
  uses: z.array(z.string()),
  useDetails: z.array(useEdgeSchema),
  summary: z.string().optional(),
});
const diagImportSchema = z.object({
  meta: z.object({
    schemaVersion: z.number(),
    generatedAt: z.string(),
    extractedAt: z.string(),
    repo: z.string(),
    branch: z.string(),
  }).passthrough(),
  modules: z.array(autoModuleSchema),
});

const searchSchema = z.object({
  module: fallback(z.string().optional(), undefined),
  src: fallback(z.enum(["auto", "curated"]).optional(), undefined),
});

export const Route = createFileRoute("/architecture")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Architecture — SWMM5+ Repo Explorer" },
      { name: "description", content: "Interactive module dependency graph of SWMM5+ auto-extracted from Fortran source, with subsystem layers and per-module file links." },
      { property: "og:title", content: "SWMM5+ architecture & module graph" },
      { property: "og:description", content: "Auto-extracted Fortran module dependencies, clickable graph, links to every file on GitHub." },
    ],
  }),
  component: ArchitecturePage,
});

function ArchitecturePage() {
  const { module: selectedId, src } = Route.useSearch();
  const source: GraphSource = src ?? "auto";
  const navigate = useNavigate({ from: Route.fullPath });

  const setSelectedId = useCallback((id: string | null) => {
    navigate({ search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, module: id ?? undefined }), replace: true });
  }, [navigate]);

  const setSource = useCallback((next: GraphSource) => {
    navigate({ search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, src: next === "auto" ? undefined : next, module: undefined }), replace: true });
  }, [navigate]);

  const lookup = source === "auto" ? AUTO_MODULES_BY_ID : MODULES_BY_ID;
  const selected = selectedId && lookup[selectedId] ? selectedId : null;
  const nodeCount = source === "auto" ? AUTO_MODULES.length : MODULES.length;
  const edgeCount = source === "auto" ? EDGE_COUNT
    : MODULES.reduce((s, m) => s + m.uses.filter((u) => MODULES_BY_ID[u]).length, 0);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="font-display text-4xl">Architecture</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        SWMM5+ is organised into eight loosely-coupled subsystems. <span className="text-foreground">Initialization</span>{" "}
        and the <span className="text-foreground">EPA-SWMM C interface</span> stand up the network; the{" "}
        <span className="text-foreground">time loop</span> drives the finite-volume Saint-Venant solver each step;{" "}
        <span className="text-foreground">geometry</span> and <span className="text-foreground">special elements</span>{" "}
        supply constitutive relations; <span className="text-foreground">output</span> writes HDF5 and CSV; and{" "}
        <span className="text-foreground">utilities</span> wire everything together.
      </p>

      <div className="mt-10 rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl">Subsystem layers</h2>
        <SubsystemDiagram />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="h-[600px] overflow-hidden p-0">
          <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-medium">Module dependency graph</h2>
              <Badge variant="outline" className="font-mono text-[10px]">
                {nodeCount} modules · {edgeCount} edges
              </Badge>
            </div>
            <Tabs value={source} onValueChange={(v) => setSource(v as GraphSource)}>
              <TabsList className="h-7">
                <TabsTrigger value="auto" className="h-5 px-2 text-[11px]">Auto-extracted</TabsTrigger>
                <TabsTrigger value="curated" className="h-5 px-2 text-[11px]">Curated</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex flex-wrap gap-3 border-b border-border px-4 py-2 text-[10px] uppercase tracking-wider">
            {SUBSYSTEMS.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.graphColor }} />
                {s.name}
              </span>
            ))}
          </div>
          <div className="h-[510px]">
            <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">Loading graph…</div>}>
              <ModuleGraph onSelect={setSelectedId} selectedId={selected} source={source} />
            </Suspense>
          </div>
        </Card>

        <Card className="p-5">
          {!selected ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Click a node to inspect the module — its file, dependencies, and a link to the source on GitHub.</p>
              <p className="text-xs">
                <span className="text-foreground">Auto-extracted</span> parses every <code className="rounded bg-muted px-1">use&nbsp;X</code> statement in the <code className="rounded bg-muted px-1">.f90</code> sources of{" "}
                <a className="underline" href={`https://github.com/${GITHUB_REPO}/tree/${GITHUB_BRANCH}`} target="_blank" rel="noreferrer">
                  {GITHUB_REPO}@{GITHUB_BRANCH}
                </a>.
              </p>
            </div>
          ) : (
            <ModuleDetail id={selected} source={source} />
          )}
        </Card>
      </div>

      <ExtractionSummary />
    </div>
  );
}

function ExtractionSummary() {
  const [imported, setImported] = useState<DiagPayload | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [subsFilter, setSubsFilter] = useState<Set<SubsystemId>>(new Set(SUBSYSTEMS.map((s) => s.id)));
  const [query, setQuery] = useState("");

  const baseModules: AutoModule[] = imported?.modules ?? AUTO_MODULES;
  const sourceLabel = imported ? "imported snapshot" : "live extraction";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return baseModules.filter((m) =>
      subsFilter.has(m.subsystem as SubsystemId) &&
      (q === "" || m.name.toLowerCase().includes(q) || m.path.toLowerCase().includes(q))
    );
  }, [baseModules, subsFilter, query]);

  const allIds = new Set(baseModules.map((m) => m.id));
  const unresolved = filtered.flatMap((m) =>
    m.useDetails.filter((e) => !allIds.has(e.name)).map((e) => ({ from: m, edge: e }))
  );
  const totalEdges = filtered.reduce((s, m) => s + m.useDetails.length, 0);
  const isFiltered = filtered.length !== baseModules.length || query !== "";
  const date = new Date(imported?.meta.extractedAt ?? EXTRACTED_AT).toISOString().slice(0, 10);

  const filterMeta: ExportMeta["filter"] = {
    subsystems: subsFilter.size === SUBSYSTEMS.length ? "all" : [...subsFilter],
    query,
  };

  const onImportClick = () => fileRef.current?.click();
  const onFile = async (f: File) => {
    setImportErr(null);
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      const parsed = diagImportSchema.parse(json);
      if (parsed.meta.schemaVersion !== EXPORT_SCHEMA_VERSION) {
        throw new Error(`Unsupported schema version ${parsed.meta.schemaVersion} (expected ${EXPORT_SCHEMA_VERSION})`);
      }
      const ids = new Set(parsed.modules.map((m) => m.id));
      const unres = parsed.modules.flatMap((m) =>
        m.useDetails.filter((e) => !ids.has(e.name)).map((e) => ({
          sourceModule: m.name, sourcePath: m.path, targetModule: e.name,
          line: e.line, only: e.only, source: e.source,
        }))
      );
      setImported({
        meta: parsed.meta as ExportMeta,
        modules: parsed.modules as AutoModule[],
        stats: {
          filesScanned: parsed.modules.length, modulesDeclared: parsed.modules.length,
          useEdges: parsed.modules.reduce((s, m) => s + m.useDetails.length, 0),
          unresolvedTargets: unres.length,
        },
        unresolved: unres,
      });
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : String(e));
    }
  };

  const toggleSub = (id: SubsystemId) => {
    setSubsFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="mt-10 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl">
          Extraction diagnostics
          {imported && <Badge variant="outline" className="ml-2 align-middle text-[10px]">imported</Badge>}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef} type="file" accept="application/json,.json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ""; }}
          />
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-[11px]" onClick={onImportClick}>
            <Upload className="h-3.5 w-3.5" /> Import JSON
          </Button>
          {imported && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => { setImported(null); setImportErr(null); }}>
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
          <Button
            variant="outline" size="sm" className="h-7 gap-1.5 text-[11px]"
            onClick={() => downloadJson("swmm5plus-extraction.json", buildExportPayload(baseModules))}
          >
            <Download className="h-3.5 w-3.5" /> JSON (all)
          </Button>
          <Button
            variant="outline" size="sm" className="h-7 gap-1.5 text-[11px]"
            onClick={() => downloadCsv("swmm5plus-extraction.csv", buildExportCsvRows(baseModules), buildMeta())}
          >
            <Download className="h-3.5 w-3.5" /> CSV (all)
          </Button>
          <Button
            variant="default" size="sm" className="h-7 gap-1.5 text-[11px]"
            disabled={!isFiltered}
            onClick={() => downloadJson("swmm5plus-extraction-filtered.json", buildExportPayload(filtered, filterMeta))}
          >
            <Download className="h-3.5 w-3.5" /> JSON (filtered)
          </Button>
          <Button
            variant="default" size="sm" className="h-7 gap-1.5 text-[11px]"
            disabled={!isFiltered}
            onClick={() => downloadCsv("swmm5plus-extraction-filtered.csv", buildExportCsvRows(filtered), buildMeta(filterMeta))}
          >
            <Download className="h-3.5 w-3.5" /> CSV (filtered)
          </Button>
        </div>
      </div>

      <div className="mt-1 text-[11px] text-muted-foreground">
        Source: {sourceLabel} · snapshot {date} ·{" "}
        <a className="underline" target="_blank" rel="noreferrer" href={`https://github.com/${GITHUB_REPO}/tree/${GITHUB_BRANCH}`}>
          {GITHUB_REPO}@{GITHUB_BRANCH}
        </a>{" "}
        · exports include schema v{EXPORT_SCHEMA_VERSION}, generator timestamp, and extractor settings
      </div>

      {importErr && (
        <div className="mt-3 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Import failed: {importErr}
        </div>
      )}

      <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
        Relationships are mined from the Fortran sources by walking every <code className="rounded bg-muted px-1">.f90</code> file
        under the eight subsystem directories, locating the file's <code className="rounded bg-muted px-1">module &lt;name&gt;</code>{" "}
        declaration, and matching each <code className="rounded bg-muted px-1">use &lt;dep&gt;[, only: …]</code> token after stripping{" "}
        <code className="rounded bg-muted px-1">!</code> comments.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded border border-border bg-secondary/30 p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter</div>
        <Input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="module name or path…"
          className="h-7 max-w-xs text-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {SUBSYSTEMS.map((s) => {
            const on = subsFilter.has(s.id);
            return (
              <button
                key={s.id} type="button" onClick={() => toggleSub(s.id)}
                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] transition-colors ${
                  on ? "border-border bg-background text-foreground" : "border-border/40 bg-transparent text-muted-foreground line-through"
                }`}
              >
                <span className="h-2 w-2 rounded-sm" style={{ background: s.graphColor }} />
                {s.name}
              </button>
            );
          })}
        </div>
        {isFiltered && (
          <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-[10px]"
            onClick={() => { setSubsFilter(new Set(SUBSYSTEMS.map((s) => s.id))); setQuery(""); }}>
            Reset
          </Button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Modules (filtered)" value={`${filtered.length} / ${baseModules.length}`} />
        <Stat label="use edges (filtered)" value={totalEdges.toString()} />
        <Stat label="Unresolved (filtered)" value={unresolved.length.toString()} tone={unresolved.length ? "warn" : "ok"} />
        <Stat label="Schema version" value={`v${EXPORT_SCHEMA_VERSION}`} />
      </div>

      {unresolved.length > 0 && (
        <div className="mt-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Unresolved <code className="rounded bg-muted px-1">use</code> targets
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            These names appear in a <code className="rounded bg-muted px-1">use</code> statement but no scanned <code className="rounded bg-muted px-1">.f90</code> file
            declares a matching <code className="rounded bg-muted px-1">module</code> — typically Fortran intrinsics (<code className="rounded bg-muted px-1">iso_c_binding</code>) or external libs.
          </p>
          <ol className="mt-2 divide-y divide-border rounded border border-border bg-secondary/30 font-mono text-[11px]">
            {unresolved.slice(0, 50).map((x, i) => (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-2 py-1.5">
                <code className="truncate">
                  <span className="text-destructive">{x.edge.name}</span>
                  <span className="text-muted-foreground"> ← {x.from.path}</span>
                </code>
                <a href={githubFileUrl(x.from.path, x.edge.line)} target="_blank" rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground">
                  L{x.edge.line}
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded border border-border bg-background p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl ${tone === "warn" ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}

function ModuleDetail({ id, source }: { id: string; source: GraphSource }) {
  if (source === "auto") {
    const m = AUTO_MODULES_BY_ID[id];
    const sub = SUBSYSTEM_BY_ID[m.subsystem];
    const incoming = AUTO_MODULES.filter((x) => x.uses.includes(id));
    return (
      <div className="text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: sub.graphColor }} />
          <Badge variant="outline" className="font-normal">{sub.name}</Badge>
        </div>
        <h3 className="mt-2 font-display text-2xl break-all">{m.name}</h3>
        <a href={githubFileUrl(m.path, m.declaredLine)} target="_blank" rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
          <code>{m.path}:{m.declaredLine}</code>
          <ExternalLink className="h-3 w-3" />
        </a>
        {m.summary && <p className="mt-3 leading-relaxed">{m.summary}</p>}
        <ExtractionTrace mod={m} />
        <UseList label={`Used by (${incoming.length})`} ids={incoming.map((x) => x.id)} />
      </div>
    );
  }

  const m = MODULES_BY_ID[id];
  const sub = SUBSYSTEM_BY_ID[m.subsystem];
  const incoming = MODULES.filter((x) => x.uses.includes(id));
  return (
    <div className="text-sm">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: sub.graphColor }} />
        <Badge variant="outline" className="font-normal">{sub.name}</Badge>
      </div>
      <h3 className="mt-2 font-display text-2xl">{m.label}</h3>
      <a href={githubFileUrl(m.path)} target="_blank" rel="noreferrer"
        className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
        <code>{m.path}</code>
        <ExternalLink className="h-3 w-3" />
      </a>
      <p className="mt-3 leading-relaxed">{m.summary}</p>
      {m.cEquivalent && (
        <div className="mt-4 rounded border border-border bg-secondary/50 p-3 text-xs">
          <div className="font-medium text-foreground">EPA SWMM5 (C):</div>
          <code className="mt-1 block">{m.cEquivalent.file}{m.cEquivalent.symbol ? ` · ${m.cEquivalent.symbol}` : ""}</code>
          {m.cEquivalent.notes && <p className="mt-2 text-muted-foreground">{m.cEquivalent.notes}</p>}
        </div>
      )}
      <UseList label={`Uses (${m.uses.length})`} ids={m.uses} />
      <UseList label={`Used by (${incoming.length})`} ids={incoming.map((x) => x.id)} />
    </div>
  );
}

function ExtractionTrace({ mod }: { mod: AutoModule }) {
  const ids = new Set(AUTO_MODULES.map((m) => m.id));
  if (mod.useDetails.length === 0) {
    return (
      <div className="mt-4 rounded border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
        No <code className="rounded bg-muted px-1">use</code> statements detected in this file.
      </div>
    );
  }
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Extraction trace · {mod.useDetails.length} edge{mod.useDetails.length === 1 ? "" : "s"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="sm"
            className="h-6 gap-1 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={() => downloadJson(`${mod.name}-trace.json`, {
              meta: buildMeta(),
              module: { id: mod.id, name: mod.name, path: mod.path, declaredLine: mod.declaredLine, subsystem: mod.subsystem },
              useDetails: mod.useDetails as UseEdge[],
            })}
          >
            <Download className="h-3 w-3" /> JSON
          </Button>
          <div className="text-[10px] text-muted-foreground">line · source</div>
        </div>
      </div>
      <ol className="mt-2 divide-y divide-border rounded border border-border bg-secondary/30 font-mono text-[11px]">
        {mod.useDetails.map((e) => {
          const known = ids.has(e.name);
          return (
            <li key={`${e.name}-${e.line}`} className="grid grid-cols-[44px_1fr] gap-2 px-2 py-1.5">
              <a href={githubFileUrl(mod.path, e.line)} target="_blank" rel="noreferrer"
                className="text-right text-muted-foreground hover:text-foreground"
                title={`Open ${mod.path} at line ${e.line} on GitHub`}>
                L{e.line}
              </a>
              <div className="min-w-0">
                <code className="block break-all">
                  <span className="text-muted-foreground">use </span>
                  <span className={known ? "text-foreground" : "text-destructive"}>{e.name}</span>
                  {e.only && (
                    <>
                      <span className="text-muted-foreground">, only: </span>
                      <span className="text-foreground/80">{e.only}</span>
                    </>
                  )}
                </code>
                {!known && (
                  <div className="mt-0.5 text-[10px] font-sans text-destructive/80">
                    target not found in extracted module set (excluded from graph)
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function UseList({ label, ids }: { label: string; ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {ids.map((u) => (
          <Badge key={u} variant="secondary" className="font-mono text-[10px]">{u}</Badge>
        ))}
      </div>
    </div>
  );
}

function SubsystemDiagram() {
  const groups: { row: string; ids: SubsystemId[] }[] = [
    { row: "Setup",     ids: ["init", "interface"] },
    { row: "Model",     ids: ["network", "hydrology"] },
    { row: "Solve",     ids: ["timeloop", "hydraulics"] },
    { row: "Persist",   ids: ["output"] },
    { row: "Cross-cut", ids: ["utility"] },
  ];
  return (
    <div className="mt-4 space-y-3">
      {groups.map((g) => (
        <div key={g.row} className="grid grid-cols-[80px_1fr] items-center gap-4">
          <div className="text-right text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{g.row}</div>
          <div className="flex flex-wrap gap-2">
            {g.ids.map((id) => {
              const s = SUBSYSTEM_BY_ID[id];
              return (
                <div key={id} className="min-w-[180px] flex-1 rounded-md border border-border bg-background p-3" style={{ borderLeft: `3px solid ${s.graphColor}` }}>
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{s.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
