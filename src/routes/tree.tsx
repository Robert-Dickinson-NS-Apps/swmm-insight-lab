import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Folder, FileCode, ExternalLink } from "lucide-react";
import { REPO_TREE, type TreeNode } from "@/data/tree";
import { SUBSYSTEM_BY_ID } from "@/data/subsystems";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/tree")({
  head: () => ({
    meta: [
      { title: "Code tree — SWMM5+ Repo Explorer" },
      { name: "description", content: "Browsable folder tree of CIMM-ORG/SWMM5plus-1 with a curated purpose line for every major Fortran file." },
      { property: "og:title", content: "SWMM5+ code tree" },
      { property: "og:description", content: "Folder-by-folder map of the SWMM5+ Fortran source." },
    ],
  }),
  component: TreePage,
});

const GH = "https://github.com/CIMM-ORG/SWMM5plus-1/tree/development";

function TreePage() {
  const [selected, setSelected] = useState<TreeNode>(REPO_TREE);
  return (
    <div className="grid h-[calc(100vh-3rem)] grid-cols-[minmax(260px,400px)_1fr]">
      <aside className="overflow-auto border-r border-border bg-card/40 p-3">
        <TreeBranch node={REPO_TREE} depth={0} onSelect={setSelected} selectedPath={selected.path} defaultOpen />
      </aside>
      <section className="overflow-auto p-8">
        <DetailPanel node={selected} />
      </section>
    </div>
  );
}

function TreeBranch({
  node, depth, onSelect, selectedPath, defaultOpen = false,
}: { node: TreeNode; depth: number; onSelect: (n: TreeNode) => void; selectedPath: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const isDir = node.kind === "dir";
  const hasChildren = !!node.children?.length;
  const Caret = open ? ChevronDown : ChevronRight;
  const sub = node.subsystem ? SUBSYSTEM_BY_ID[node.subsystem] : undefined;

  return (
    <div>
      <button
        onClick={() => { if (isDir && hasChildren) setOpen((o) => !o); onSelect(node); }}
        className={`flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-sm hover:bg-secondary ${selectedPath === node.path ? "bg-secondary" : ""}`}
        style={{ paddingLeft: depth * 12 + 6 }}
      >
        {isDir && hasChildren ? <Caret className="h-3.5 w-3.5 flex-none text-muted-foreground" /> : <span className="w-3.5 flex-none" />}
        {isDir ? <Folder className="h-3.5 w-3.5 flex-none text-accent" /> : <FileCode className="h-3.5 w-3.5 flex-none text-muted-foreground" />}
        <span className="truncate font-mono text-[12.5px]">{node.name}</span>
        {sub && <span className="ml-auto h-2 w-2 flex-none rounded-sm" style={{ background: sub.graphColor }} />}
      </button>
      {open && hasChildren && (
        <div>
          {node.children!.map((c) => (
            <TreeBranch key={c.path || c.name} node={c} depth={depth + 1} onSelect={onSelect} selectedPath={selectedPath} />
          ))}
        </div>
      )}
    </div>
  );
}

function DetailPanel({ node }: { node: TreeNode }) {
  const sub = node.subsystem ? SUBSYSTEM_BY_ID[node.subsystem] : undefined;
  const ghUrl = node.path ? `${GH}/${node.path}` : "https://github.com/CIMM-ORG/SWMM5plus-1";
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">{node.path || "/"}</span>
        <span>·</span>
        <span className="uppercase tracking-wider">{node.kind}</span>
      </div>
      <h1 className="mt-2 font-display text-4xl">{node.name || "SWMM5plus-1"}</h1>
      {sub && (
        <div className="mt-3 flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ background: sub.graphColor }} />
          <Badge variant="outline" className="font-normal">{sub.name}</Badge>
        </div>
      )}
      {node.description && <p className="mt-5 text-base leading-relaxed text-foreground/90">{node.description}</p>}
      {sub && <p className="mt-3 text-sm text-muted-foreground">{sub.description}</p>}
      <div className="mt-8">
        <a href={ghUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
          View on GitHub <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
