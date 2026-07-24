import { createFileRoute, Link } from "@tanstack/react-router";
import { SUBSYSTEMS } from "@/data/subsystems";
import { MODULES } from "@/data/modules";
import { PAPERS, RESEARCH_STATUS_NOTICE } from "@/data/papers";
import { AUTO_MODULES } from "@/data/auto-modules";
import { ProvenanceBar } from "@/components/provenance-bar";
import { Card } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, FolderTree, Network, BookOpen, GitCompare } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SWMM5+ Repo Explorer — Overview" },
      { name: "description", content: "An interactive map of the CIMM-ORG SWMM5+ Fortran codebase, the Hodges research papers behind it, and a side-by-side mapping to EPA SWMM 5.1.13 (C)." },
      { property: "og:title", content: "SWMM5+ Repo Explorer" },
      { property: "og:description", content: "Map of the SWMM5+ Fortran codebase + Hodges papers + side-by-side with EPA SWMM 5.1.13 (C)." },
    ],
  }),
  component: OverviewPage,
});

// Exactly one of the extracted source units is PROGRAM SWMM (main/main.f90);
// the rest are Fortran modules. Surface the distinction rather than a single
// combined count that the previous copy conflated.
const SOURCE_UNITS = AUTO_MODULES.length;
const MAIN_PROGRAMS = AUTO_MODULES.filter((m) => m.path === "main/main.f90").length;
const MODULE_UNITS = SOURCE_UNITS - MAIN_PROGRAMS;

function OverviewPage() {
  const cards = [
    { to: "/tree" as const, icon: FolderTree, title: "Code tree", desc: "Browse every source folder and major Fortran file with a one-line purpose." },
    { to: "/architecture" as const, icon: Network, title: "Architecture", desc: "Subsystem diagram + interactive module dependency graph, color-coded by role." },
    { to: "/papers" as const, icon: BookOpen, title: "Hodges papers", desc: `${PAPERS.length} curated papers from Ben Hodges & collaborators, mapped to the code.` },
    { to: "/c-alternative" as const, icon: GitCompare, title: "vs EPA SWMM 5.1.13 (C)", desc: "Side-by-side: each SWMM5+ Fortran module ↔ its EPA SWMM 5.1.13 C counterpart." },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-xs uppercase tracking-[0.18em] text-accent font-medium">CIMM-ORG · SWMM5plus-1</p>
      <h1 className="mt-3 text-5xl md:text-6xl leading-[1.05]">
        A finite-volume, coarray-parallel<br />
        <span className="italic text-accent">re-engineering</span> of EPA SWMM.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
        SWMM5+ is a prototype Fortran 2008 hydraulic engine that re-uses the
        EPA SWMM 5.1.13 C runtime for input parsing and hydrology, and replaces
        the dynamic-wave solver with a conservative finite-volume Saint-Venant
        scheme partitioned across coarray images. This explorer maps the
        codebase, links each subsystem back to the research papers behind it,
        and shows how every Fortran module corresponds to its equivalent in
        the exact EPA SWMM 5.1.13 C source that SWMM5+ bundles via CMake
        FetchContent.
      </p>

      <div className="mt-8">
        <ProvenanceBar />
      </div>

      <Card className="mt-4 border-amber-500/40 bg-amber-500/5 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600 dark:text-amber-400" />
          <div className="text-sm">
            <div className="font-medium text-foreground">Research software — not production-ready</div>
            <p className="mt-1 text-muted-foreground">{RESEARCH_STATUS_NOTICE}</p>
          </div>
        </div>
      </Card>

      <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
        {[
          { k: "Fortran source units", v: SOURCE_UNITS, sub: `${MODULE_UNITS} modules + ${MAIN_PROGRAMS} main program` },
          { k: "Subsystems", v: SUBSYSTEMS.length },
          { k: "Curated papers", v: PAPERS.length },
          { k: "C counterparts mapped", v: MODULES.filter((m) => m.cEquivalent && m.cEquivalent.file !== "—").length },
        ].map((s) => (
          <div key={s.k} className="border-t border-border pt-4">
            <div className="font-display text-4xl">{s.v}</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.k}</div>
            {s.sub && <div className="mt-0.5 text-[10px] text-muted-foreground/70">{s.sub}</div>}
          </div>
        ))}
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="group">
            <Card className="h-full p-6 transition-colors hover:bg-secondary/60">
              <div className="flex items-start gap-4">
                <div className="rounded-md border border-border bg-secondary p-2.5">
                  <c.icon className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-2xl">{c.title}</h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-14">
        <h2 className="text-2xl">Subsystems at a glance</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {SUBSYSTEMS.map((s) => (
            <div key={s.id} className="flex gap-3 rounded-md border border-border bg-card p-4">
              <span className="mt-1.5 inline-block h-3 w-3 flex-none rounded-sm" style={{ background: s.graphColor }} />
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
