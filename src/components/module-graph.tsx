import { useEffect, useRef, useState, type ComponentType } from "react";
import { MODULES } from "@/data/modules";
import { SUBSYSTEM_BY_ID } from "@/data/subsystems";

interface GraphProps {
  onSelect: (id: string | null) => void;
  selectedId: string | null;
}

interface FGProps {
  graphData: { nodes: { id: string; color: string; subsystem: string }[]; links: { source: string; target: string }[] };
  nodeLabel: (n: { id: string }) => string;
  nodeColor: (n: { color: string }) => string;
  nodeRelSize: number;
  linkColor: () => string;
  linkDirectionalArrowLength: number;
  linkDirectionalArrowRelPos: number;
  onNodeClick: (n: { id: string }) => void;
  backgroundColor: string;
  cooldownTicks: number;
}

const DATA = {
  nodes: MODULES.map((m) => ({
    id: m.id,
    color: SUBSYSTEM_BY_ID[m.subsystem].graphColor,
    subsystem: m.subsystem,
  })),
  links: MODULES.flatMap((m) =>
    m.uses
      .filter((u) => MODULES.some((x) => x.id === u))
      .map((u) => ({ source: m.id, target: u })),
  ),
};

export default function ModuleGraph({ onSelect, selectedId }: GraphProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 500 });
  const [FG, setFG] = useState<ComponentType<FGProps> | null>(null);

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
              graphData={DATA as FGProps["graphData"]}
              nodeLabel={(n) => n.id}
              nodeColor={(n) => n.color}
              nodeRelSize={5}
              linkColor={() => "rgba(120,120,140,0.35)"}
              linkDirectionalArrowLength={3}
              linkDirectionalArrowRelPos={0.85}
              onNodeClick={(n) => onSelect(n.id)}
              backgroundColor="transparent"
              cooldownTicks={120}
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
