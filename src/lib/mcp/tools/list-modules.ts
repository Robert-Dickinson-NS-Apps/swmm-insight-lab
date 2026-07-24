import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { AUTO_MODULES } from "@/data/auto-modules";
import { buildProvenance } from "@/lib/mcp/provenance";

export default defineTool({
  name: "list_modules",
  title: "List SWMM5+ modules",
  description:
    "List all Fortran modules extracted from the SWMM5+ codebase, optionally filtered by subsystem. Every response includes a `provenance` envelope pinning the SWMM5+ revision and EPA runtime version (5.1.13).",
  inputSchema: {
    subsystem: z
      .string()
      .optional()
      .describe("Optional subsystem id (e.g. 'hydraulics', 'network', 'init', 'timeloop', 'output', 'interface', 'utility')."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ subsystem }) => {
    const rows = AUTO_MODULES.filter((m) => !subsystem || m.subsystem === subsystem).map((m) => ({
      id: m.id,
      name: m.name,
      path: m.path,
      subsystem: m.subsystem,
      useCount: m.uses.length,
    }));
    const provenance = buildProvenance();
    return {
      content: [{ type: "text", text: `Found ${rows.length} modules.\n\n${JSON.stringify(rows, null, 2)}` }],
      structuredContent: { modules: rows, provenance },
    };
  },
});
