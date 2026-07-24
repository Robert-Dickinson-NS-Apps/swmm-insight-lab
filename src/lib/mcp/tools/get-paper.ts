import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PAPERS } from "@/data/papers";
import { buildProvenance } from "@/lib/mcp/provenance";

export default defineTool({
  name: "get_paper",
  title: "Get Hodges paper details",
  description:
    "Return full metadata and direct links (DOI/URL) for a single curated Hodges research paper by id. Response includes a `provenance` envelope.",
  inputSchema: {
    id: z.string().min(1).describe("Paper id (e.g. 'hodges2019-hess', 'hodges-2024-jee')."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id }) => {
    const p = PAPERS.find((x) => x.id === id.toLowerCase());
    if (!p) {
      const known = PAPERS.map((x) => x.id).join(", ");
      return {
        content: [{ type: "text", text: `No paper found with id '${id}'. Known ids: ${known}` }],
        isError: true,
      };
    }
    const doiMatch = p.url.match(/doi\.org\/(.+)$/i);
    const detail = {
      id: p.id,
      title: p.title,
      authors: p.authors,
      year: p.year,
      venue: p.venue,
      primary: p.primary ?? false,
      evidenceLevel: p.evidenceLevel ?? (p.primary ? "implementation-source" : "direct-basis"),
      summary: p.summary,
      links: {
        canonical: p.url,
        doi: doiMatch ? `https://doi.org/${doiMatch[1]}` : null,
        doiId: doiMatch ? doiMatch[1] : null,
      },
      relatedSubsystems: p.relatedSubsystems,
      relatedModules: p.relatedModules ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify({ ...detail, provenance: buildProvenance() }, null, 2) }],
      structuredContent: { ...detail, provenance: buildProvenance() },
    };
  },
});
