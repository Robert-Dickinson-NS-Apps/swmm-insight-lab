import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { SUBSYSTEM_BY_ID } from "@/data/subsystems";
import { AUTO_MODULES } from "@/data/auto-modules";
import { MODULES } from "@/data/modules";

export type GraphSource = "auto" | "curated";

interface GraphProps {
  onSelect: (id: string | null) => void;
  selectedId: string | null | undefined;
  source: GraphSource;
}

interface FGProps {
  graphData: { nodes: { id: string; color: string }[]; links: { source: string; target: string }[] };
  nodeLabel: (n: { id: string }) => string;
  nodeColor: (n: { color: string; id: string }) => string;
  nodeRelSize: number;
  linkColor: () => string;
  linkDirectionalArrowLength: number;
  linkDirectionalArrowRelPos: number;
  onNodeClick: (n: { id: string }) => void;
  backgroundColor: string;
  cooldownTicks: number;
}

function buildAuto() {
  const ids = new Set(AUTO_MODULES.map((m) => m.id));
  return {
    nodes: AUTO_MODULES.map((m) => ({ id: m.id, color: SUBSYSTEM_BY_ID[m.subsystem].graphColor })),
    links: AUTO_MODULES.flatMap((m) =>
      m.uses.filter((u) => ids.has(u) && u !== m.id).map((u) => ({ source: m.id, target: u })),
    ),
  };
}

function buildCurated() {
  const ids = new Set(MODULES.map((m) => m.id));
  return {
    nodes: MODULES.map((m) => ({ id: m.id, color: SUBSYSTEM_BY_ID[m.subsystem].graphColor })),
    links: MODULES.flatMap((m) =>
      m.uses.filter((u) => ids.has(u)).map((u) => ({ source: m.id, target: u })),
    ),
  };
}

export default function ModuleGraph({ onSelect, selectedId, source }: GraphProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 500 });
  const [FG, setFG] = useState<ComponentType<FGProps> | null>(null);

  const data = useMemo(() => (source === "auto" ? buildAuto() : buildCurated()), [source]);

  useEffect(() => {
    let mounted = true;
    import("react-force-graph-2d").then((m) => {
      if (mounted) setFG(() => m.default as unknown as ComponentType<FGProps>);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver(() => {
      if (wrap.current) setSize({ w: wrap.current.clientWidth, h: wrap.current.clientHeight });
    });
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrap} className="h-full w-full">
      {FG ? (
        (() => {
          const Comp = FG as unknown as ComponentType<FGProps & { width: number; height: number }>;
          return (
            <Comp
              graphData={data}
              nodeLabel={(n) => n.id}
              nodeColor={(n) => (selectedId && n.id === selectedId ? "#ffffff" : n.color)}
              nodeRelSize={5}
              linkColor={() => "rgba(120,120,140,0.3)"}
              linkDirectionalArrowLength={2.5}
              linkDirectionalArrowRelPos={0.85}
              onNodeClick={(n) => onSelect(n.id)}
              backgroundColor="transparent"
              cooldownTicks={140}
              width={size.w}
              height={size.h}
            />
          );
        })()
      ) : (
        <div className="grid h-full place-items-center text-sm text-muted-foreground">Loading graph…</div>
      )}
    </div>
  );
}
