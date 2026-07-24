import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { AUTO_MODULES_BY_ID, githubFileUrl } from "@/data/auto-modules";
import { buildProvenance } from "@/lib/mcp/provenance";

export default defineTool({
  name: "get_module",
  title: "Get SWMM5+ module details",
  description:
    "Return metadata for a single Fortran module: file path, subsystem, dependencies (use statements), and GitHub link. Response `structuredContent` includes a `provenance` envelope.",
  inputSchema: {
    id: z.string().min(1).describe("Module id, lowercase (e.g. 'face', 'runge_kutta2')."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id }) => {
    const m = AUTO_MODULES_BY_ID[id.toLowerCase()];
    if (!m) {
      return { content: [{ type: "text", text: `No module found with id '${id}'.` }], isError: true };
    }
    const detail = {
      id: m.id,
      name: m.name,
      path: m.path,
      subsystem: m.subsystem,
      declaredLine: m.declaredLine,
      summary: m.summary,
      githubUrl: githubFileUrl(m.path, m.declaredLine),
      uses: m.useDetails,
    };
    const provenance = buildProvenance();
    return {
      content: [{ type: "text", text: JSON.stringify({ ...detail, provenance }, null, 2) }],
      structuredContent: { ...detail, provenance },
    };
  },
});
