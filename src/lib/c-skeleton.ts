import type { AutoModule } from "@/data/auto-modules";
import { AUTO_MODULES_BY_ID } from "@/data/auto-modules";

/**
 * Mechanically derive a C header + source skeleton from a Fortran module.
 * The skeletons compile as empty stubs — bodies are TODO placeholders.
 * Naming convention:
 *   Fortran  module foo_bar           → header  foo_bar.h / source foo_bar.c
 *   Fortran  subroutine foo_init      → C       void foo_bar__foo_init(void);
 *
 * Goals:
 *   • Self-contained per-module .h/.c so the user can drop into MSVC/CMake.
 *   • #include each Fortran `use` dependency as its translated header.
 *   • No assumption about argument types — every stub is `void(void)` with TODO.
 */

const HEADER_LINE = "/* ------------------------------------------------------------ */";

function guardName(mod: string): string {
  return `SWMM5PLUS_${mod.toUpperCase()}_H`;
}

function headerFile(mod: string): string {
  return `${mod}.h`;
}

function sourceFile(mod: string): string {
  return `${mod}.c`;
}

export interface CSkeleton {
  header: { name: string; content: string };
  source: { name: string; content: string };
}

export function generateCSkeleton(m: AutoModule): CSkeleton {
  const guard = guardName(m.id);
  const includes = m.uses
    .filter((u) => AUTO_MODULES_BY_ID[u]) // only include modules we know about
    .map((u) => `#include "${headerFile(u)}"`)
    .join("\n");

  const externIncludes = m.uses
    .filter((u) => !AUTO_MODULES_BY_ID[u])
    .map((u) => `/* external / EPA-SWMM dependency: ${u} (no header generated) */`)
    .join("\n");

  // A representative public entry point — every Fortran module gets at least
  // one "module_init" stub the user can flesh out.
  const initFn = `${m.id}__init`;
  const stepFn = `${m.id}__step`;
  const finFn = `${m.id}__finalize`;

  const header = `${HEADER_LINE}
/*  ${m.id}.h
 *  Auto-generated C translation skeleton for Fortran module:
 *      module ${m.name}
 *      source: ${m.path}:${m.declaredLine}
 *  Subsystem: ${m.subsystem}
 *
 *  THIS FILE IS A STUB. Fill in declarations as you port the
 *  corresponding Fortran subroutines / functions.
 */
${HEADER_LINE}
#ifndef ${guard}
#define ${guard}

#ifdef __cplusplus
extern "C" {
#endif

${includes || "/* (no in-project dependencies) */"}
${externIncludes ? "\n" + externIncludes : ""}

/* --- Public API (translate from the Fortran public interface) --- */
void ${initFn}(void);
void ${stepFn}(double dt);
void ${finFn}(void);

#ifdef __cplusplus
} /* extern "C" */
#endif

#endif /* ${guard} */
`;

  const usesList = m.useDetails.length
    ? m.useDetails
        .map(
          (u) =>
            ` *    use ${u.name}${u.only ? ", only: " + u.only.trim() : ""}   [${m.path}:${u.line}]`,
        )
        .join("\n")
    : " *    (no use statements)";

  const source = `${HEADER_LINE}
/*  ${m.id}.c
 *  Auto-generated C translation skeleton for Fortran module:
 *      module ${m.name}
 *      source: ${m.path}:${m.declaredLine}
 *
 *  Fortran dependencies (USE statements):
${usesList}
 */
${HEADER_LINE}
#include "${headerFile(m.id)}"

#include <stdio.h>   /* TODO: trim includes as you implement bodies */
#include <stdlib.h>
#include <math.h>

void ${initFn}(void) {
    /* TODO: translate the initialization subroutine(s) of module ${m.name}. */
}

void ${stepFn}(double dt) {
    /* TODO: translate the time-step / update routine(s) of module ${m.name}.
     * dt is the current hydraulic time step in seconds. */
    (void)dt;
}

void ${finFn}(void) {
    /* TODO: free buffers / write closing diagnostics for module ${m.name}. */
}
`;

  return {
    header: { name: headerFile(m.id), content: header },
    source: { name: sourceFile(m.id), content: source },
  };
}
