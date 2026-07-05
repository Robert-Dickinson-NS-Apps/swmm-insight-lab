import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PAPERS } from "@/data/papers";

export default defineTool({
  name: "list_papers",
  title: "List Hodges research papers",
  description:
    "List the curated Hodges (and collaborator) research papers that inform the SWMM5+ implementation.",
  inputSchema: {
    subsystem: z.string().optional().describe("Optional subsystem id to filter related papers."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ subsystem }) => {
    const rows = PAPERS.filter(
      (p) => !subsystem || p.relatedSubsystems.includes(subsystem as never),
    ).map((p) => ({
      id: p.id,
      title: p.title,
      authors: p.authors,
      year: p.year,
      venue: p.venue,
      url: p.url,
      summary: p.summary,
      relatedSubsystems: p.relatedSubsystems,
      relatedModules: p.relatedModules,
      primary: p.primary ?? false,
    }));
    return {
      content: [{ type: "text", text: `${rows.length} papers.\n\n${JSON.stringify(rows, null, 2)}` }],
      structuredContent: { papers: rows },
    };
  },
});
