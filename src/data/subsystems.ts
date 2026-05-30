export type SubsystemId =
  | "init"
  | "network"
  | "hydraulics"
  | "hydrology"
  | "timeloop"
  | "output"
  | "utility"
  | "interface";

export interface Subsystem {
  id: SubsystemId;
  name: string;
  description: string;
  /** Tailwind class to color a swatch (uses tokens defined in styles.css) */
  swatchClass: string;
  /** Hex used for the force graph (kept in sync with CSS oklch tokens) */
  graphColor: string;
}

export const SUBSYSTEMS: Subsystem[] = [
  {
    id: "init",
    name: "Initialization",
    description:
      "Reads the EPA-SWMM input file, builds runtime configuration, partitions the network for parallel run, and allocates the main data arrays.",
    swatchClass: "bg-sub-init",
    graphColor: "#5b8def",
  },
  {
    id: "network",
    name: "Network & Geometry",
    description:
      "Link–node topology, cross-section geometry (rectangular, trapezoidal, circular, custom transects), element discretization into finite-volume cells.",
    swatchClass: "bg-sub-network",
    graphColor: "#3aa7a4",
  },
  {
    id: "hydraulics",
    name: "Hydraulics Solver",
    description:
      "Finite-volume Saint-Venant solver: face/element fluxes, slot pressurization for surcharge, junction/diagnostic update, Runge-Kutta stepping.",
    swatchClass: "bg-sub-hydraulics",
    graphColor: "#e07a4f",
  },
  {
    id: "hydrology",
    name: "Hydrology",
    description:
      "Sub-catchment runoff handled through the linked EPA-SWMM hydrology engine; results are fed in as lateral inflows at nodes.",
    swatchClass: "bg-sub-hydrology",
    graphColor: "#5fa771",
  },
  {
    id: "timeloop",
    name: "Time Loop & Control",
    description:
      "Outer time stepping, adaptive time-step selection, hydraulics/hydrology coupling, CFL control, monitoring of convergence and mass balance.",
    swatchClass: "bg-sub-timeloop",
    graphColor: "#a273c8",
  },
  {
    id: "output",
    name: "Output & I/O",
    description:
      "Writes element/face/link/node results to HDF5 and CSV, combines coarray images at finalize, packages reports for post-processing.",
    swatchClass: "bg-sub-output",
    graphColor: "#c9a24a",
  },
  {
    id: "utility",
    name: "Utilities & Definitions",
    description:
      "Shared modules: keys/enumerations, datatypes, allocation, debug, profiling, string and array helpers, coarray-aware utilities.",
    swatchClass: "bg-sub-utility",
    graphColor: "#7a7f8c",
  },
  {
    id: "interface",
    name: "EPA-SWMM C Interface",
    description:
      "Fortran ⇄ C interoperability layer that drives the bundled EPA SWMM5 C engine for input parsing and hydrology; the bridge that makes SWMM5+ a drop-in dynamic-wave replacement.",
    swatchClass: "bg-sub-interface",
    graphColor: "#d05c4e",
  },
];

export const SUBSYSTEM_BY_ID: Record<SubsystemId, Subsystem> = Object.fromEntries(
  SUBSYSTEMS.map((s) => [s.id, s]),
) as Record<SubsystemId, Subsystem>;
