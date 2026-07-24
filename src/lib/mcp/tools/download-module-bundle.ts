import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import JSZip from "jszip";
import { AUTO_MODULES_BY_ID, rawFileUrl, githubFileUrl, GITHUB_REPO, GITHUB_BRANCH } from "@/data/auto-modules";
import { buildProvenance, sha256Hex } from "@/lib/mcp/provenance";

/**
 * Return a zip containing the selected module's Fortran source plus the
 * source files of every in-repo module it transitively `use`s, so the caller
 * has everything needed to compile the module locally.
 */
export default defineTool({
  name: "download_module_bundle",
  title: "Download SWMM5+ module bundle",
  description:
    "Return a zip (base64) containing the selected module's Fortran source and the sources of every in-repo module it transitively depends on via `use` statements, plus a MANIFEST.json listing the files.",
  inputSchema: {
    id: z.string().min(1).describe("Module id (lowercase, e.g. 'face', 'runge_kutta2')."),
    includeTransitive: z
      .boolean()
      .optional()
      .describe("Include the full transitive `use` closure (default true). If false, only direct dependencies are included."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ id, includeTransitive }) => {
    const root = AUTO_MODULES_BY_ID[id.toLowerCase()];
    if (!root) {
      return { content: [{ type: "text", text: `No module found with id '${id}'.` }], isError: true };
    }

    const deep = includeTransitive ?? true;
    const collected = new Map<string, typeof root>();
    collected.set(root.id, root);
    const queue = [...root.uses];
    while (queue.length) {
      const next = queue.shift()!;
      const dep = AUTO_MODULES_BY_ID[next];
      if (!dep || collected.has(dep.id)) continue;
      collected.set(dep.id, dep);
      if (deep) queue.push(...dep.uses);
    }

    const modules = [...collected.values()];
    const zip = new JSZip();
    const files: { id: string; path: string; bytes: number; ok: boolean }[] = [];
    const unresolved = new Set<string>();

    await Promise.all(
      modules.map(async (m) => {
        try {
          const res = await fetch(rawFileUrl(m.path));
          if (!res.ok) {
            files.push({ id: m.id, path: m.path, bytes: 0, ok: false });
            return;
          }
          const src = await res.text();
          zip.file(m.path, src);
          files.push({ id: m.id, path: m.path, bytes: src.length, ok: true });
          for (const u of m.uses) if (!AUTO_MODULES_BY_ID[u]) unresolved.add(u);
        } catch {
          files.push({ id: m.id, path: m.path, bytes: 0, ok: false });
        }
      }),
    );

    const manifest = {
      root: { id: root.id, name: root.name, path: root.path },
      repo: GITHUB_REPO,
      branch: GITHUB_BRANCH,
      generatedAt: new Date().toISOString(),
      includeTransitive: deep,
      moduleCount: modules.length,
      files,
      unresolvedExternalUses: [...unresolved].sort(),
      githubUrls: modules.map((m) => ({ id: m.id, url: githubFileUrl(m.path) })),
    };
    zip.file("MANIFEST.json", JSON.stringify(manifest, null, 2));

    const readme = `# ${root.id} bundle

Root module: ${root.name} (${root.path})
Repo: ${GITHUB_REPO}@${GITHUB_BRANCH}
Includes ${modules.length} Fortran source file(s) covering the ${deep ? "transitive" : "direct"} \`use\` closure.

To compile with gfortran (from the extracted root):

    gfortran -c ${modules.map((m) => m.path).join(" \\\n            ")}

Unresolved external \`use\` targets (Fortran intrinsics or EPA-SWMM C shims):
${[...unresolved].sort().map((u) => `  - ${u}`).join("\n") || "  (none)"}
`;
    zip.file("README.md", readme);

    const buf = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    const b64 =
      typeof Buffer !== "undefined"
        ? Buffer.from(buf).toString("base64")
        : btoa(String.fromCharCode(...buf));
    const filename = `${root.id}_bundle.zip`;

    return {
      content: [
        {
          type: "text",
          text: `Bundle for '${root.id}' — ${modules.length} file(s), ${buf.byteLength} bytes zipped.\nDecode 'zipBase64' from structuredContent and save as ${filename}.`,
        },
        {
          type: "resource",
          resource: {
            uri: `mcp://swmm5plus/bundle/${root.id}.zip`,
            mimeType: "application/zip",
            blob: b64,
          },
        },
      ],
      structuredContent: {
        filename,
        mimeType: "application/zip",
        bytes: buf.byteLength,
        moduleCount: modules.length,
        manifest,
        zipBase64: b64,
        content_sha256: await sha256Hex(buf),
        provenance: buildProvenance(),
      },
    };
  },
});
