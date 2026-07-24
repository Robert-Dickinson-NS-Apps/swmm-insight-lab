import { createFileRoute } from "@tanstack/react-router";
import { PAPERS, RESEARCH_STATUS_NOTICE, type EvidenceLevel } from "@/data/papers";
import { SUBSYSTEM_BY_ID } from "@/data/subsystems";
import { ProvenanceBar } from "@/components/provenance-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink, Star } from "lucide-react";

export const Route = createFileRoute("/papers")({
  head: () => ({
    meta: [
      { title: "Hodges papers — SWMM5+ Repo Explorer" },
      { name: "description", content: "Curated reading list of Ben Hodges (and collaborator) papers underpinning the SWMM5+ solver, partitioner, and Preissmann slot." },
      { property: "og:title", content: "The research behind SWMM5+" },
      { property: "og:description", content: "Ten Hodges & collaborator papers mapped to the SWMM5+ subsystems they shaped, with explicit evidence-level tags." },
    ],
  }),
  component: PapersPage,
});

const EVIDENCE_LABEL: Record<EvidenceLevel, string> = {
  "implementation-source": "Implementation source",
  "direct-basis": "Direct mathematical basis",
  "author-cited-context": "Author-cited context",
  "explorer-inference": "Explorer inference",
};

const EVIDENCE_COLOR: Record<EvidenceLevel, string> = {
  "implementation-source": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "direct-basis": "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  "author-cited-context": "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  "explorer-inference": "bg-muted text-muted-foreground border-border",
};

function inferEvidence(p: (typeof PAPERS)[number]): EvidenceLevel {
  if (p.evidenceLevel) return p.evidenceLevel;
  if (p.primary) return "implementation-source";
  // Hodges-authored papers on the SVE/FV/Preissmann formulation are the direct
  // mathematical basis for the corresponding SWMM5+ modules.
  return "direct-basis";
}

function PapersPage() {
  const sorted = [...PAPERS].sort((a, b) => Number(!!b.primary) - Number(!!a.primary) || b.year - a.year);
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-4xl">The research behind SWMM5+</h1>

      <div className="mt-4">
        <ProvenanceBar />
      </div>

      <Card className="mt-5 border-amber-500/40 bg-amber-500/5 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600 dark:text-amber-400" />
          <div className="text-sm">
            <div className="font-medium text-foreground">Research-status notice</div>
            <p className="mt-1 text-muted-foreground">{RESEARCH_STATUS_NOTICE}</p>
          </div>
        </div>
      </Card>

      <p className="mt-5 max-w-3xl text-muted-foreground">
        Ten papers from Ben R. Hodges (Notre Dame / UT Austin) and close
        collaborators that directly inform the SWMM5+ codebase. Each is tagged
        with the subsystems it underpins and with an{" "}
        <span className="font-medium text-foreground">evidence level</span> —
        distinguishing papers the SWMM5+ authors explicitly cite from
        relationships this explorer inferred from context.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
        {(Object.keys(EVIDENCE_LABEL) as EvidenceLevel[]).map((k) => (
          <Badge key={k} variant="outline" className={"border font-normal " + EVIDENCE_COLOR[k]}>
            {EVIDENCE_LABEL[k]}
          </Badge>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {sorted.map((p) => {
          const evidence = inferEvidence(p);
          return (
            <Card key={p.id} className="p-6">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{p.year}</span>
                    <span>·</span>
                    <span className="italic">{p.venue}</span>
                    {p.primary && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 text-accent"><Star className="h-3 w-3" /> primary</span>
                      </>
                    )}
                    <span>·</span>
                    <Badge variant="outline" className={"border font-normal " + EVIDENCE_COLOR[evidence]}>
                      {EVIDENCE_LABEL[evidence]}
                    </Badge>
                  </div>
                  <h2 className="mt-1 font-display text-2xl leading-snug">{p.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{p.authors}</p>
                  <p className="mt-3 text-[15px] leading-relaxed">{p.summary}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {p.relatedSubsystems.map((sid) => {
                      const s = SUBSYSTEM_BY_ID[sid];
                      return (
                        <Badge key={sid} variant="outline" className="gap-1.5 font-normal">
                          <span className="h-2 w-2 rounded-sm" style={{ background: s.graphColor }} />
                          {s.name}
                        </Badge>
                      );
                    })}
                    {p.relatedModules?.map((mid) => (
                      <Badge key={mid} variant="secondary" className="font-mono text-[10px]">{mid}</Badge>
                    ))}
                  </div>

                  <a href={p.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
                    {p.url.includes("doi.org") ? "DOI" : "Open"} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
