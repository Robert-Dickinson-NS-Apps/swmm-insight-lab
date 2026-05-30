import { createFileRoute } from "@tanstack/react-router";
import { useState, lazy, Suspense } from "react";
import { SUBSYSTEMS, SUBSYSTEM_BY_ID, type SubsystemId } from "@/data/subsystems";
import { MODULES, MODULES_BY_ID } from "@/data/modules";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const ModuleGraph = lazy(() => import("@/components/module-graph"));

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture — SWMM5+ Repo Explorer" },
      { name: "description", content: "Subsystem architecture of SWMM5+ plus an interactive module dependency graph (force-directed)." },
      { property: "og:title", content: "SWMM5+ architecture & module graph" },
      { property: "og:description", content: "How SWMM5+'s eight subsystems fit together, plus a clickable dependency graph." },
    ],
  }),
  component: ArchitecturePage,
});

function ArchitecturePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? MODULES_BY_ID[selectedId] : null;

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

      {/* Layered diagram */}
      <div className="mt-10 rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl">Subsystem layers</h2>
        <SubsystemDiagram />
      </div>

      {/* Force graph + side panel */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="h-[560px] overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-medium">Module dependency graph</h2>
            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider">
              {SUBSYSTEMS.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.graphColor }} />
                  {s.name}
                </span>
              ))}
            </div>
          </div>
          <div className="h-[510px]">
            <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">Loading graph…</div>}>
              <ModuleGraph onSelect={setSelectedId} selectedId={selectedId} />
            </Suspense>
          </div>
        </Card>

        <Card className="p-5">
          {!selected ? (
            <div className="text-sm text-muted-foreground">
              Click a node to inspect the module. Edges are curated `use` relationships — drag to reposition, scroll to zoom.
            </div>
          ) : (
            <ModuleDetail id={selected.id} />
          )}
        </Card>
      </div>
    </div>
  );
}

function ModuleDetail({ id }: { id: string }) {
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
      <code className="mt-1 block text-[11px] text-muted-foreground">{m.path}</code>
      <p className="mt-3 leading-relaxed">{m.summary}</p>
      {m.cEquivalent && (
        <div className="mt-4 rounded border border-border bg-secondary/50 p-3 text-xs">
          <div className="font-medium text-foreground">EPA SWMM5 (C):</div>
          <code className="mt-1 block">{m.cEquivalent.file}{m.cEquivalent.symbol ? ` · ${m.cEquivalent.symbol}` : ""}</code>
          {m.cEquivalent.notes && <p className="mt-2 text-muted-foreground">{m.cEquivalent.notes}</p>}
        </div>
      )}
      {m.uses.length > 0 && (
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Uses</div>
          <div className="mt-1.5 flex flex-wrap gap-1">{m.uses.map((u) => <Badge key={u} variant="secondary" className="font-mono text-[10px]">{u}</Badge>)}</div>
        </div>
      )}
      {incoming.length > 0 && (
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Used by</div>
          <div className="mt-1.5 flex flex-wrap gap-1">{incoming.map((u) => <Badge key={u.id} variant="secondary" className="font-mono text-[10px]">{u.id}</Badge>)}</div>
        </div>
      )}
    </div>
  );
}

function SubsystemDiagram() {
  // Hand-laid grid of subsystem boxes, arrows implied by left→right flow
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
