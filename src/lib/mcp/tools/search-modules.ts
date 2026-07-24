import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { AUTO_MODULES } from "@/data/auto-modules";
import { buildProvenance } from "@/lib/mcp/provenance";

export default defineTool({
  name: "search_modules",
  title: "Search SWMM5+ modules",
  description: "Case-insensitive substring search over module id, name, and file path. Response includes a `provenance` envelope.",
  inputSchema: {
    query: z.string().min(1).describe("Search term."),
    limit: z.number().int().min(1).max(100).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, limit }) => {
    const q = query.toLowerCase();
    const results = AUTO_MODULES.filter(
      (m) => m.id.includes(q) || m.name.toLowerCase().includes(q) || m.path.toLowerCase().includes(q),
    )
      .slice(0, limit ?? 20)
      .map((m) => ({ id: m.id, name: m.name, path: m.path, subsystem: m.subsystem }));
    return {
      content: [{ type: "text", text: `${results.length} matches for '${query}'.\n\n${JSON.stringify(results, null, 2)}` }],
      structuredContent: { results, provenance: buildProvenance() },
    };
  },
});
