import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { AUTO_MODULES_BY_ID, rawFileUrl, githubFileUrl } from "@/data/auto-modules";

export default defineTool({
  name: "fetch_module_source",
  title: "Fetch SWMM5+ module Fortran source",
  description:
    "Download the raw Fortran source of a SWMM5+ module from GitHub. Optionally truncate to a max character count.",
  inputSchema: {
    id: z.string().min(1).describe("Module id (lowercase)."),
    maxChars: z
      .number()
      .int()
      .min(500)
      .max(200000)
      .optional()
      .describe("Truncate source to this many characters (default 40000)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ id, maxChars }) => {
    const m = AUTO_MODULES_BY_ID[id.toLowerCase()];
    if (!m) {
      return { content: [{ type: "text", text: `No module found with id '${id}'.` }], isError: true };
    }
    const res = await fetch(rawFileUrl(m.path));
    if (!res.ok) {
      return {
        content: [{ type: "text", text: `Failed to fetch source (${res.status}). See ${githubFileUrl(m.path)}` }],
        isError: true,
      };
    }
    const raw = await res.text();
    const cap = maxChars ?? 40000;
    const truncated = raw.length > cap;
    const body = truncated ? `${raw.slice(0, cap)}\n\n... [truncated ${raw.length - cap} chars]` : raw;
    return {
      content: [
        { type: "text", text: `Source of ${m.path} (${raw.length} chars${truncated ? ", truncated" : ""}):\n\n${body}` },
      ],
      structuredContent: { path: m.path, url: githubFileUrl(m.path), length: raw.length, truncated, source: body },
    };
  },
});
