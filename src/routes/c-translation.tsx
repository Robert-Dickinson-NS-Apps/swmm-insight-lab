import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, Download, FileCode2, Package, Search } from "lucide-react";

import { AUTO_MODULES, githubFileUrl } from "@/data/auto-modules";
import { SUBSYSTEM_BY_ID } from "@/data/subsystems";
import { generateCSkeleton } from "@/lib/c-skeleton";
import { buildVisualStudioSolutionZip } from "@/lib/vs-solution";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/c-translation")({
  head: () => ({
    meta: [
      { title: "C port planning scaffold — SWMM5+ Repo Explorer" },
      {
        name: "description",
        content:
          "Mechanically generated file skeletons and a Visual Studio solution to plan a hypothetical Fortran→C port of SWMM5+. Numerics, types, and coarrays are NOT translated.",
      },
      { property: "og:title", content: "SWMM5+ C port planning scaffold" },
      {
        property: "og:description",
        content:
          "Empty .h/.c stubs, dependency includes, and MSVC project files — planning scaffold, not a translation.",
      },
    ],
  }),
  component: CTranslationPage,
});

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadText(filename: string, content: string, mime = "text/plain") {
  downloadBlob(filename, new Blob([content], { type: `${mime};charset=utf-8` }));
}

function CTranslationPage() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(AUTO_MODULES[0]?.id ?? "");
  const [tab, setTab] = useState<"header" | "source">("header");
  const [included, setIncluded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(AUTO_MODULES.map((m) => [m.id, true])),
  );
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

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

  const includedModules = useMemo(
    () => AUTO_MODULES.filter((m) => included[m.id]),
    [included],
  );
  const includedCount = includedModules.length;

  function setAllVisible(value: boolean) {
    setIncluded((prev) => {
      const next = { ...prev };
      for (const m of filtered) next[m.id] = value;
      return next;
    });
  }

  async function downloadVisualStudioSolution() {
    setBuildError(null);
    if (includedCount === 0) {
      setBuildError("Select at least one module to include in the solution.");
      return;
    }
    setBuilding(true);
    try {
      const { blob, filename } = await buildVisualStudioSolutionZip({
        modules: includedModules,
      });
      downloadBlob(filename, blob);
    } catch (e) {
      setBuildError(e instanceof Error ? e.message : String(e));
    } finally {
      setBuilding(false);
    }
  }

  function downloadAllText() {
    const parts = includedModules.flatMap((m) => {
      const s = generateCSkeleton(m);
      return [
        `/* ===== ${s.header.name} ===== */\n${s.header.content}`,
        `/* ===== ${s.source.name} ===== */\n${s.source.content}`,
      ];
    });
    downloadText(
      "swmm5plus_c_skeletons.txt",
      `/* SWMM5+ Fortran → C skeletons (auto-generated)\n` +
        ` * ${includedCount} modules\n` +
        ` * Split this file at the "/* ===== filename ===== */" markers. */\n\n` +
        parts.join("\n\n"),
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <p className="text-xs uppercase tracking-[0.18em] text-accent font-medium">
        C port planning scaffold
      </p>
      <h1 className="mt-2 font-display text-4xl">C port planning scaffold</h1>

      <Card className="mt-5 border-amber-500/40 bg-amber-500/5 p-4">
        <div className="text-sm">
          <div className="font-medium text-foreground">This is a scaffold, not a translation</div>
          <p className="mt-1 text-muted-foreground">
            The exporter mechanically emits file names, include guards,
            dependency <code>#include</code>s, and empty{" "}
            <code>init</code> / <code>step</code> / <code>finalize</code> stubs
            for every extracted Fortran module. It does <strong>not</strong>{" "}
            translate procedure signatures, derived types, arrays, coarrays,
            allocation semantics, module state, generic interfaces, numerics,
            HDF5 interaction, or ISO C bindings. The generated Visual Studio
            solution compiles cleanly — that only proves the empty scaffold
            builds, not that any SWMM5+ behaviour has been ported.
          </p>
        </div>
      </Card>

      <Card className="mt-3 p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Translation coverage</div>
        <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-5 text-sm">
          <CoverageStat label="Files scaffolded" value={AUTO_MODULES.length} />
          <CoverageStat label="Procedures translated" value={0} muted />
          <CoverageStat label="Types translated" value={0} muted />
          <CoverageStat label="Numerical kernels translated" value={0} muted />
          <CoverageStat label="Behavioural tests passing" value={0} muted />
        </div>
      </Card>

      <p className="mt-5 max-w-3xl text-muted-foreground">
        Pick modules below to preview or bundle. The header preserves the module's
        <code> use</code> dependencies as <code>#include</code> directives. The
        source exposes three lifecycle stubs (<code>init</code>, <code>step</code>,{" "}
        <code>finalize</code>). Every function body is a <code>TODO</code>.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button
          onClick={downloadVisualStudioSolution}
          size="sm"
          disabled={building || includedCount === 0}
        >
          <Package className="h-4 w-4" />
          {building
            ? "Building…"
            : `Download Visual Studio solution (.zip) — ${includedCount} module${includedCount === 1 ? "" : "s"}`}
        </Button>
        <Button onClick={downloadAllText} variant="outline" size="sm" disabled={includedCount === 0}>
          <Download className="h-4 w-4" />
          Download skeletons (.txt)
        </Button>
        <span className="text-xs text-muted-foreground">
          {AUTO_MODULES.length} modules total · {includedCount} selected
        </span>
      </div>
      {buildError && (
        <p className="mt-2 text-xs text-destructive">{buildError}</p>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        The .zip contains <code>swmm5plus.sln</code>,{" "}
        <code>swmm5plus.vcxproj</code>, a CMake build file, a generated{" "}
        <code>main.c</code> entry point, and one <code>.h</code>/<code>.c</code>{" "}
        pair per selected module. Open the .sln in Visual Studio 2022 (v143
        toolset, x64) and hit Build. It will link — because the bodies are empty.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* module list */}
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter modules…"
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{filtered.length} shown</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setAllVisible(true)}
                  className="rounded border border-border px-2 py-0.5 hover:bg-secondary"
                >
                  Include all
                </button>
                <button
                  type="button"
                  onClick={() => setAllVisible(false)}
                  className="rounded border border-border px-2 py-0.5 hover:bg-secondary"
                >
                  Exclude all
                </button>
              </div>
            </div>
          </div>
          <ul className="max-h-[70vh] overflow-y-auto text-sm">
            {filtered.map((m) => {
              const sub = SUBSYSTEM_BY_ID[m.subsystem];
              const active = m.id === selectedId;
              const isIncluded = !!included[m.id];
              return (
                <li
                  key={m.id}
                  className={
                    "flex items-start gap-2 border-b border-border px-3 py-2 " +
                    (active ? "bg-secondary" : "hover:bg-secondary/50")
                  }
                >
                  <Checkbox
                    checked={isIncluded}
                    onCheckedChange={(v) =>
                      setIncluded((prev) => ({ ...prev, [m.id]: !!v }))
                    }
                    className="mt-1"
                    aria-label={`Include ${m.id} in solution`}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
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
                    onClick={() => downloadText(file.name, file.content, "text/x-c")}
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
        numerics is intentionally left to you. The exported solution always
        compiles cleanly so you can build incrementally as you port each module.
      </p>
    </div>
  );
}

function CoverageStat({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="border-t border-border pt-2">
      <div className={"font-display text-2xl " + (muted ? "text-muted-foreground" : "")}>{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
