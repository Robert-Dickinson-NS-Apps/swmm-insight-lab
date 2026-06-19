import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, Download, FileCode2, Search } from "lucide-react";

import { AUTO_MODULES, githubFileUrl } from "@/data/auto-modules";
import { SUBSYSTEM_BY_ID } from "@/data/subsystems";
import { generateCSkeleton } from "@/lib/c-skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/c-translation")({
  head: () => ({
    meta: [
      { title: "C Translation — SWMM5+ Repo Explorer" },
      {
        name: "description",
        content:
          "Auto-generated C header/source skeletons for every SWMM5+ Fortran module, ready to drop into MSVC / Visual Studio or a CMake build.",
      },
      { property: "og:title", content: "SWMM5+ Fortran → C Skeletons" },
      {
        property: "og:description",
        content:
          "Browse and copy per-module C stubs derived from the SWMM5+ Fortran sources.",
      },
    ],
  }),
  component: CTranslationPage,
});

function download(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function CTranslationPage() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(AUTO_MODULES[0]?.id ?? "");
  const [tab, setTab] = useState<"header" | "source">("header");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? AUTO_MODULES.filter(
          (m) => m.id.includes(q) || m.path.toLowerCase().includes(q),
        )
      : AUTO_MODULES;
    return [...list].sort((a, b) => a.id.localeCompare(b.id));
  }, [query]);

  const selected = AUTO_MODULES.find((m) => m.id === selectedId) ?? AUTO_MODULES[0];
  const skeleton = useMemo(
    () => (selected ? generateCSkeleton(selected) : null),
    [selected],
  );

  const file = skeleton ? skeleton[tab] : null;

  function downloadAllZipless() {
    // Plain concatenated dump as a fallback (no zip dep in this project)
    const parts = AUTO_MODULES.flatMap((m) => {
      const s = generateCSkeleton(m);
      return [
        `/* ===== ${s.header.name} ===== */\n${s.header.content}`,
        `/* ===== ${s.source.name} ===== */\n${s.source.content}`,
      ];
    });
    download(
      "swmm5plus_c_skeletons.txt",
      `/* SWMM5+ Fortran → C skeletons (auto-generated)\n` +
        ` * ${AUTO_MODULES.length} modules\n` +
        ` * Split this file at the "/* ===== filename ===== */" markers. */\n\n` +
        parts.join("\n\n"),
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <p className="text-xs uppercase tracking-[0.18em] text-accent font-medium">
        C translation
      </p>
      <h1 className="mt-2 font-display text-4xl">Fortran → C skeletons</h1>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Every SWMM5+ Fortran module is mapped to a matching <code>.h</code> /{" "}
        <code>.c</code> pair below. The skeletons preserve the module's{" "}
        <code>use</code> dependencies as <code>#include</code> directives and
        expose three stub entry points (<code>init</code>, <code>step</code>,{" "}
        <code>finalize</code>) you can flesh out as you translate the
        subroutines. The output compiles as-is with MSVC, clang, or gcc — bodies
        are TODO comments.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button onClick={downloadAllZipless} variant="outline" size="sm">
          <Download className="h-4 w-4" />
          Download all skeletons (.txt)
        </Button>
        <span className="text-xs text-muted-foreground">
          {AUTO_MODULES.length} modules · header + source per module
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* module list */}
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter modules…"
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          <ul className="max-h-[70vh] overflow-y-auto text-sm">
            {filtered.map((m) => {
              const sub = SUBSYSTEM_BY_ID[m.subsystem];
              const active = m.id === selectedId;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={
                      "flex w-full items-start gap-2 border-b border-border px-3 py-2 text-left hover:bg-secondary/50 " +
                      (active ? "bg-secondary" : "")
                    }
                  >
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-sm"
                      style={{ background: sub.graphColor }}
                    />
                    <span className="min-w-0">
                      <span className="block font-mono text-[12.5px]">
                        {m.id}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {m.path}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                No modules match "{query}".
              </li>
            )}
          </ul>
        </Card>

        {/* preview */}
        <Card className="flex min-h-[60vh] flex-col overflow-hidden p-0">
          {selected && skeleton && file ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-mono text-sm">
                    <FileCode2 className="h-4 w-4 text-muted-foreground" />
                    {file.name}
                  </div>
                  <a
                    href={githubFileUrl(selected.path, selected.declaredLine)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-muted-foreground hover:underline"
                  >
                    from {selected.path}:{selected.declaredLine}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex overflow-hidden rounded-md border border-border">
                    {(["header", "source"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={
                          "px-3 py-1 text-xs " +
                          (tab === t
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary/50")
                        }
                      >
                        {t === "header" ? ".h" : ".c"}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(file.content)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => download(file.name, file.content, "text/x-c")}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {file.name}
                  </Button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto bg-background/60 p-4 font-mono text-[12px] leading-relaxed">
                {file.content}
              </pre>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a module on the left.
            </div>
          )}
        </Card>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Skeletons are derived mechanically from the extracted <code>use</code>{" "}
        graph — function signatures and bodies are placeholders. Translation of
        numerics is intentionally left to you.
      </p>
    </div>
  );
}
