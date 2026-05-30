import { createFileRoute } from "@tanstack/react-router";
import { PAPERS } from "@/data/papers";
import { SUBSYSTEM_BY_ID } from "@/data/subsystems";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Star } from "lucide-react";

export const Route = createFileRoute("/papers")({
  head: () => ({
    meta: [
      { title: "Hodges papers — SWMM5+ Repo Explorer" },
      { name: "description", content: "Curated reading list of Ben Hodges papers underpinning the SWMM5+ solver, partitioner, and Preissmann slot." },
      { property: "og:title", content: "The research behind SWMM5+" },
      { property: "og:description", content: "Ten Hodges & collaborator papers mapped to the SWMM5+ subsystems they shaped." },
    ],
  }),
  component: PapersPage,
});

function PapersPage() {
  const sorted = [...PAPERS].sort((a, b) => Number(!!b.primary) - Number(!!a.primary) || b.year - a.year);
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-4xl">The research behind SWMM5+</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        Ten papers from Ben R. Hodges (Notre Dame / UT Austin) and close
        collaborators that directly inform the SWMM5+ codebase. Each is tagged
        with the subsystems it underpins.
      </p>

      <div className="mt-8 space-y-4">
        {sorted.map((p) => (
          <Card key={p.id} className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{p.year}</span>
                  <span>·</span>
                  <span className="italic">{p.venue}</span>
                  {p.primary && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-accent"><Star className="h-3 w-3" /> primary</span>
                    </>
                  )}
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
        ))}
      </div>
    </div>
  );
}
