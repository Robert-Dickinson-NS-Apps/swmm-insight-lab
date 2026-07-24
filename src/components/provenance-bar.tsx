import { SWMM5PLUS, EPA_RUNTIME, EXTRACTED_AT, EXPLORER_VERSION } from "@/data/provenance";

/**
 * Compact snapshot-identity strip. Every content page shows this so the
 * user always knows which SWMM5+ revision and which EPA SWMM runtime the
 * information on the page describes.
 */
export function ProvenanceBar({ className = "" }: { className?: string }) {
  const extractedDate = EXTRACTED_AT.slice(0, 10);
  return (
    <div
      className={
        "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground " +
        className
      }
    >
      <span>
        <span className="uppercase tracking-wider">SWMM5+</span>{" "}
        <a
          href={`https://github.com/${SWMM5PLUS.repo}/tree/${SWMM5PLUS.branch}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono hover:underline"
        >
          {SWMM5PLUS.repo}@{SWMM5PLUS.branch}
        </a>
      </span>
      <span>
        <span className="uppercase tracking-wider">EPA runtime</span>{" "}
        <a
          href={`https://github.com/${EPA_RUNTIME.repo}/tree/${EPA_RUNTIME.ref}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono hover:underline"
        >
          {EPA_RUNTIME.ref}
        </a>{" "}
        <span className="text-muted-foreground/70">(bundled via CMake FetchContent)</span>
      </span>
      <span>
        <span className="uppercase tracking-wider">Snapshot</span>{" "}
        <span className="font-mono">{extractedDate}</span>
      </span>
      <span>
        <span className="uppercase tracking-wider">Explorer</span>{" "}
        <span className="font-mono">v{EXPLORER_VERSION}</span>
      </span>
    </div>
  );
}
