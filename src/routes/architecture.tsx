import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useCallback } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SUBSYSTEMS, SUBSYSTEM_BY_ID, type SubsystemId } from "@/data/subsystems";
import { MODULES, MODULES_BY_ID } from "@/data/modules";
import { AUTO_MODULES, AUTO_MODULES_BY_ID, EDGE_COUNT, EXTRACTED_AT, GITHUB_REPO, GITHUB_BRANCH, githubFileUrl } from "@/data/auto-modules";
import type { GraphSource } from "@/components/module-graph";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink } from "lucide-react";

const ModuleGraph = lazy(() => import("@/components/module-graph"));

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

  const setSelectedId = useCallback(
    (id: string | null) => {
      navigate({
        search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, module: id ?? undefined }),
        replace: true,
      });
    },
    [navigate],
  );

  const setSource = useCallback(
    (next: GraphSource) => {
      navigate({
        search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, src: next === "auto" ? undefined : next, module: undefined }),
        replace: true,
      });
    },
    [navigate],
  );

  const lookup = source === "auto" ? AUTO_MODULES_BY_ID : MODULES_BY_ID;
  const selected = selectedId && lookup[selectedId] ? selectedId : null;
  const nodeCount = source === "auto" ? AUTO_MODULES.length : MODULES.length;
  const edgeCount = source === "auto"
    ? EDGE_COUNT
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
              <p>
                Click a node to inspect the module — its file, dependencies, and a link to the source on GitHub.
              </p>
              <p className="text-xs">
                <span className="text-foreground">Auto-extracted</span> parses every <code className="rounded bg-muted px-1">use&nbsp;X</code> statement in the <code className="rounded bg-muted px-1">.f90</code> sources of{" "}
                <a className="underline" href={`https://github.com/${GITHUB_REPO}/tree/${GITHUB_BRANCH}`} target="_blank" rel="noreferrer">
                  {GITHUB_REPO}@{GITHUB_BRANCH}
                </a>. <span className="text-foreground">Curated</span> is a hand-picked subset with prose summaries and EPA-SWMM C equivalents.
              </p>
            </div>
          ) : (
            <ModuleDetail id={selected} source={source} />
          )}
        </Card>
      </div>
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
        <a
          href={githubFileUrl(m.path, m.declaredLine)}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
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
      <a
        href={githubFileUrl(m.path)}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
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

function ExtractionTrace({ mod }: { mod: (typeof AUTO_MODULES)[number] }) {
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
        <div className="text-[10px] text-muted-foreground">line · source</div>
      </div>
      <ol className="mt-2 divide-y divide-border rounded border border-border bg-secondary/30 font-mono text-[11px]">
        {mod.useDetails.map((e) => {
          const known = ids.has(e.name);
          return (
            <li key={`${e.name}-${e.line}`} className="grid grid-cols-[44px_1fr] gap-2 px-2 py-1.5">
              <a
                href={githubFileUrl(mod.path, e.line)}
                target="_blank"
                rel="noreferrer"
                className="text-right text-muted-foreground hover:text-foreground"
                title={`Open ${mod.path} at line ${e.line} on GitHub`}
              >
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
      <p className="mt-2 text-[10px] text-muted-foreground">
        Each row is a literal <code className="rounded bg-muted px-1">use</code> token matched by{" "}
        <code className="rounded bg-muted px-1">/^\s*use\s+(\w+)(?:\s*,\s*only\s*:[^!]*)?/i</code>{" "}
        after stripping <code className="rounded bg-muted px-1">!</code> comments. Click a line number to jump to it on GitHub.
      </p>
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
