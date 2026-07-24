import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MODULES, type CRelation } from "@/data/modules";
import { SUBSYSTEMS, SUBSYSTEM_BY_ID } from "@/data/subsystems";
import { EPA_RUNTIME, EPA_REFERENCE, SWMM5PLUS, epaFileUrl } from "@/data/provenance";
import { ProvenanceBar } from "@/components/provenance-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/c-alternative")({
  head: () => ({
    meta: [
      { title: "vs EPA SWMM (C) — SWMM5+ Repo Explorer" },
      { name: "description", content: "Side-by-side mapping of every SWMM5+ Fortran module to its EPA SWMM C equivalent — pinned to the v5.1.13 runtime SWMM5+ actually links against." },
      { property: "og:title", content: "SWMM5+ Fortran ↔ EPA SWMM 5.1.13 (C)" },
      { property: "og:description", content: "Module-by-module comparison against the exact EPA SWMM C source that SWMM5+ bundles via CMake FetchContent." },
    ],
  }),
  component: CAlternativePage,
});

const F = `https://github.com/${SWMM5PLUS.repo}/blob/${SWMM5PLUS.branch}`;

const RELATION_LABEL: Record<CRelation, string> = {
  "direct-port": "Direct port",
  "functional-analogue": "Functional analogue",
  "centralized-equivalent": "Centralized equivalent",
  "shared-concept": "Shared concept",
  "wrapper": "Wrapper",
  "extension": "Extension",
  "new-in-swmm5plus": "New in SWMM5+",
};

const RELATION_COLOR: Record<CRelation, string> = {
  "direct-port": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "functional-analogue": "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  "centralized-equivalent": "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  "shared-concept": "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  "wrapper": "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
  "extension": "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  "new-in-swmm5plus": "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

function CAlternativePage() {
  const [mode, setMode] = useState<"runtime" | "reference">("runtime");
  const groups = SUBSYSTEMS.map((s) => ({
    sub: s,
    rows: MODULES.filter((m) => m.subsystem === s.id),
  })).filter((g) => g.rows.length > 0);

  const mapped = MODULES.filter((m) => m.cEquivalent && m.cEquivalent.file !== "—").length;
  const target = mode === "runtime" ? EPA_RUNTIME : EPA_REFERENCE;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <p className="text-xs uppercase tracking-[0.18em] text-accent font-medium">Side-by-side</p>
      <h1 className="mt-2 font-display text-4xl">SWMM5+ (Fortran) ↔ EPA SWMM (C)</h1>

      <div className="mt-4">
        <ProvenanceBar />
      </div>

      <p className="mt-5 max-w-3xl text-muted-foreground">
        SWMM5+ doesn't replace EPA SWMM — it wraps it. Input parsing, hydrology,
        and control rules still execute in the original C runtime; only the
        hydraulics solver is rewritten in Fortran as a finite-volume,
        coarray-parallel engine. The rows below map each SWMM5+ Fortran module
        onto its EPA SWMM C counterpart, with an explicit <em>relation</em>{" "}
        (direct port, functional analogue, centralized equivalent, and so on)
        and a confidence flag.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">EPA source:</span>
        <div className="flex overflow-hidden rounded-md border border-border text-xs">
          <button
            type="button"
            onClick={() => setMode("runtime")}
            className={
              "px-3 py-1.5 " +
              (mode === "runtime" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50")
            }
          >
            Runtime — {EPA_RUNTIME.ref} (bundled)
          </button>
          <button
            type="button"
            onClick={() => setMode("reference")}
            className={
              "border-l border-border px-3 py-1.5 " +
              (mode === "reference" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50")
            }
          >
            Reference — {EPA_REFERENCE.ref} (modern)
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {mode === "runtime"
            ? "The C source SWMM5+ actually links (via CMake FetchContent) is EPA SWMM 5.1.13. Use this for accurate module mapping."
            : "Modern EPA SWMM master is NOT what SWMM5+ links today; APIs and files differ from 5.1.13. Use for orientation only."}
        </p>
      </div>

      <p className="mt-5 text-sm text-muted-foreground">
        <strong className="text-foreground">{mapped}</strong> of{" "}
        <strong className="text-foreground">{MODULES.length}</strong> curated
        modules have a defined C counterpart. Cross-section shapes (parabolic,
        rect-round, rect-triang, mod-basket, filled-circular, power-function)
        map into EPA's centralized <code className="font-mono">xsect.c</code>{" "}
        rather than dedicated files — they are marked{" "}
        <span className="font-medium">Centralized equivalent</span>, not "no equivalent."
      </p>

      <Card className="mt-8 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">SWMM5+ Fortran</th>
                <th className="px-4 py-3 font-medium">EPA SWMM (C) — {target.ref}</th>
                <th className="px-4 py-3 font-medium">Relation</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(({ sub, rows }) => (
                <FragmentGroup key={sub.id} subName={sub.name} color={sub.graphColor} rows={rows} mode={mode} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        Fortran sources: <code>{SWMM5PLUS.repo}@{SWMM5PLUS.branch}</code>. C sources: <code>{target.repo}@{target.ref}</code>.{" "}
        Relations are hand-curated; those flagged <span className="italic">reviewed</span> have been verified against the EPA source. Others carry a confidence hint.
      </p>
    </div>
  );
}

function FragmentGroup({ subName, color, rows, mode }: { subName: string; color: string; rows: typeof MODULES; mode: "runtime" | "reference" }) {
  return (
    <>
      <tr className="border-b border-border bg-background/60">
        <td colSpan={4} className="px-4 py-2">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
            {subName}
          </div>
        </td>
      </tr>
      {rows.map((m) => {
        const sub = SUBSYSTEM_BY_ID[m.subsystem];
        const cFile = m.cEquivalent?.file;
        const cIsFile = cFile && cFile !== "—";
        const relation = m.cEquivalent?.relation;
        const confidence = m.cEquivalent?.confidence;
        const reviewed = m.cEquivalent?.reviewed;
        return (
          <tr key={m.id} className="border-b border-border align-top hover:bg-secondary/40">
            <td className="px-4 py-3">
              <a href={`${F}/${m.path}`} target="_blank" rel="noreferrer" className="group inline-flex items-start gap-1.5">
                <span>
                  <span className="font-mono text-[12.5px]">{m.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{m.path}</span>
                </span>
                <ExternalLink className="mt-0.5 h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
              <p className="mt-1.5 max-w-md text-[12.5px] text-muted-foreground">{m.summary}</p>
              <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="h-2 w-2 rounded-sm" style={{ background: sub.graphColor }} />
                {sub.name}
              </span>
            </td>
            <td className="px-4 py-3">
              {cFile ? (
                cIsFile ? (
                  <a href={epaFileUrl(mode, cFile)} target="_blank" rel="noreferrer" className="group inline-flex items-start gap-1.5">
                    <span>
                      <span className="font-mono text-[12.5px]">{cFile}</span>
                      {m.cEquivalent?.symbol && <span className="block text-[11px] text-muted-foreground">{m.cEquivalent.symbol}</span>}
                    </span>
                    <ExternalLink className="mt-0.5 h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                ) : (
                  <span className="font-mono text-[12.5px] text-muted-foreground">— no counterpart —</span>
                )
              ) : (
                <span className="font-mono text-[12.5px] text-muted-foreground">—</span>
              )}
            </td>
            <td className="px-4 py-3">
              {relation ? (
                <div className="flex flex-col gap-1">
                  <Badge variant="outline" className={"w-fit border font-normal " + RELATION_COLOR[relation]}>
                    {RELATION_LABEL[relation]}
                  </Badge>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {reviewed ? "reviewed" : "unreviewed"}
                    {confidence ? ` · ${confidence} confidence` : ""}
                  </span>
                </div>
              ) : m.cEquivalent ? (
                <span className="text-[11px] text-muted-foreground italic">unclassified</span>
              ) : (
                <span className="text-[11px] text-muted-foreground">—</span>
              )}
            </td>
            <td className="px-4 py-3 text-[12.5px] text-muted-foreground">
              {m.cEquivalent?.notes ?? (m.cEquivalent ? "" : "Not yet mapped in this explorer.")}
            </td>
          </tr>
        );
      })}
    </>
  );
}
