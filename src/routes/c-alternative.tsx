import { createFileRoute } from "@tanstack/react-router";
import { MODULES } from "@/data/modules";
import { SUBSYSTEMS, SUBSYSTEM_BY_ID } from "@/data/subsystems";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/c-alternative")({
  head: () => ({
    meta: [
      { title: "vs EPA SWMM5 (C) — SWMM5+ Repo Explorer" },
      { name: "description", content: "Side-by-side mapping of every SWMM5+ Fortran module to its EPA SWMM5 C equivalent in USEPA/Stormwater-Management-Model." },
      { property: "og:title", content: "SWMM5+ Fortran ↔ EPA SWMM5 C" },
      { property: "og:description", content: "If you replaced the SWMM5+ Fortran engine with the EPA SWMM5 C code, here is the mapping module-by-module." },
    ],
  }),
  component: CAlternativePage,
});

const EPA = "https://github.com/USEPA/Stormwater-Management-Model/blob/master";
const F   = "https://github.com/CIMM-ORG/SWMM5plus-1/blob/development";

function CAlternativePage() {
  const groups = SUBSYSTEMS.map((s) => ({
    sub: s,
    rows: MODULES.filter((m) => m.subsystem === s.id),
  })).filter((g) => g.rows.length > 0);

  const mapped = MODULES.filter((m) => m.cEquivalent).length;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <p className="text-xs uppercase tracking-[0.18em] text-accent font-medium">Side-by-side</p>
      <h1 className="mt-2 font-display text-4xl">SWMM5+ (Fortran) ↔ EPA SWMM5 (C)</h1>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        SWMM5+ doesn't replace EPA SWMM5 — it wraps it. Input parsing, hydrology
        and control rules still execute in the original C runtime; only the
        hydraulics solver is rewritten in Fortran as a finite-volume, coarray-parallel
        engine. The table below shows, module by module, where each SWMM5+ Fortran
        file maps onto the EPA SWMM5 C source — and where SWMM5+ adds new
        capability with no C analogue.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        <strong className="text-foreground">{mapped}</strong> of <strong className="text-foreground">{MODULES.length}</strong> modules have a C equivalent. The rest (partitioning, FV discretization, air-entrapment, packed-mask arrays) are new in SWMM5+.
      </p>

      <Card className="mt-8 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">SWMM5+ Fortran</th>
                <th className="px-4 py-3 font-medium">EPA SWMM5 (C)</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(({ sub, rows }) => (
                <FragmentGroup key={sub.id} subName={sub.name} color={sub.graphColor} rows={rows} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        Fortran sources: <code>CIMM-ORG/SWMM5plus-1@development</code>. C sources: <code>USEPA/Stormwater-Management-Model@master</code>.
      </p>
    </div>
  );
}

function FragmentGroup({ subName, color, rows }: { subName: string; color: string; rows: typeof MODULES }) {
  return (
    <>
      <tr className="border-b border-border bg-background/60">
        <td colSpan={3} className="px-4 py-2">
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
                  <a href={`${EPA}/${cFile}`} target="_blank" rel="noreferrer" className="group inline-flex items-start gap-1.5">
                    <span>
                      <span className="font-mono text-[12.5px]">{cFile}</span>
                      {m.cEquivalent?.symbol && <span className="block text-[11px] text-muted-foreground">{m.cEquivalent.symbol}</span>}
                    </span>
                    <ExternalLink className="mt-0.5 h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                ) : (
                  <span className="font-mono text-[12.5px] text-muted-foreground">— no equivalent —</span>
                )
              ) : (
                <span className="font-mono text-[12.5px] text-muted-foreground">—</span>
              )}
            </td>
            <td className="px-4 py-3 text-[12.5px] text-muted-foreground">
              {m.cEquivalent?.notes ?? (m.cEquivalent ? "" : "New in SWMM5+ — no direct counterpart in EPA SWMM5.")}
            </td>
          </tr>
        );
      })}
    </>
  );
}
