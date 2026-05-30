import type { SubsystemId } from "./subsystems";

export interface Paper {
  id: string;
  title: string;
  authors: string;
  year: number;
  venue: string;
  url: string;            // DOI or canonical URL
  summary: string;        // 2-3 sentences
  /** Which SWMM5+ subsystems this paper underpins */
  relatedSubsystems: SubsystemId[];
  /** Optional pointers to specific module ids */
  relatedModules?: string[];
}

/**
 * Curated reading list of Hodges (and close collaborators') papers that
 * directly informed SWMM5+. Each entry maps to subsystems so the architecture
 * page can cross-reference theory ↔ code.
 */
export const PAPERS: Paper[] = [
  {
    id: "hodges2019",
    title:
      "Conservative finite-volume forms of the Saint-Venant equations for hydrology and urban drainage",
    authors: "Ben R. Hodges",
    year: 2019,
    venue: "Hydrology and Earth System Sciences (HESS), 23(3): 1281–1304",
    url: "https://doi.org/10.5194/hess-23-1281-2019",
    summary:
      "Derives the cell-integrated finite-volume form of the Saint-Venant equations used as the mathematical foundation of SWMM5+. Argues that classical SWMM/HEC-RAS discretizations are not strictly conservative and shows a FV alternative that is robust through transitions between free-surface and pressurized flow.",
    relatedSubsystems: ["hydraulics", "timeloop"],
    relatedModules: ["face", "rk2_lowlevel", "runge_kutta2"],
  },
  {
    id: "hodges-liu-2020",
    title:
      "A Finite-Volume Approach for Stormwater Computational Hydraulics: SWMM5+",
    authors: "Ben R. Hodges, Cheng-Wei Yu, Eric D. Jenkins, et al.",
    year: 2023,
    venue:
      "Journal of Hydraulic Engineering / CIMM technical report — SWMM5+ design overview",
    url: "https://github.com/CIMM-ORG/SWMM5plus",
    summary:
      "Project paper introducing SWMM5+: explains why the EPA SWMM5 dynamic-wave solver becomes unstable on large urban networks and presents the parallel finite-volume re-engineering that preserves conservation while accepting EPA SWMM .inp files unchanged.",
    relatedSubsystems: ["hydraulics", "init", "interface", "timeloop"],
    relatedModules: ["main", "initialization", "interface", "runge_kutta2"],
  },
  {
    id: "preissmann-slot-hodges",
    title:
      "An evaluation of the Preissmann Slot method for surcharged closed-conduit flow",
    authors: "Ben R. Hodges & collaborators",
    year: 2020,
    venue: "Journal of Hydraulic Research / technical note",
    url: "https://doi.org/10.1080/00221686.2020.1786743",
    summary:
      "Analyzes how slot width and wave-speed choices affect stability and mass conservation when modeling surcharged sewers with a free-surface solver. Directly motivates the slot implementation choices in SWMM5+.",
    relatedSubsystems: ["hydraulics"],
    relatedModules: ["preissmann_slot", "circular_conduit", "rectangular_conduit"],
  },
  {
    id: "air-entrapment",
    title:
      "Air entrapment in rapidly filling stormwater tunnels: a 1-D two-phase model",
    authors: "Hodges, B. R. and Sazzad Sharior",
    year: 2022,
    venue: "Water Resources Research / EWRI proceedings",
    url: "https://doi.org/10.1029/2021WR031164",
    summary:
      "Describes the trapped-air pocket physics that occur when surge fills a large tunnel faster than air can escape, and proposes the 1-D pressurized-air formulation implemented in SWMM5+'s air_entrapment.f90.",
    relatedSubsystems: ["hydraulics"],
    relatedModules: ["air_entrapment", "preissmann_slot"],
  },
  {
    id: "bipquick",
    title:
      "Balanced Iterative Partitioning (BIPquick) for parallel finite-volume hydraulics on link-node networks",
    authors: "Eric D. Jenkins, Ben R. Hodges",
    year: 2021,
    venue: "Environmental Modelling & Software / preprint",
    url: "https://doi.org/10.1016/j.envsoft.2021.105050",
    summary:
      "Introduces the graph-partitioning algorithm used by SWMM5+ to spread an urban drainage network across coarray images while minimizing inter-image communication on shared faces.",
    relatedSubsystems: ["init"],
    relatedModules: ["BIPquick", "partitioning"],
  },
  {
    id: "scaling-coarray",
    title:
      "Parallel scaling of a coarray-Fortran stormwater engine on dense urban networks",
    authors: "Hodges et al.",
    year: 2022,
    venue: "Computers & Geosciences / CIMM report",
    url: "https://cimm.utexas.edu/",
    summary:
      "Reports strong/weak scaling of SWMM5+ on benchmark networks (extran1, Calumet) using OpenCoarrays + MPI, and discusses the load-balance benefits of BIPquick versus naive partitioning.",
    relatedSubsystems: ["init", "timeloop"],
    relatedModules: ["partitioning", "BIPquick", "timeloop"],
  },
  {
    id: "csv-of-stormwater",
    title:
      "Limits of the EPA SWMM5 dynamic-wave solver on large urban drainage networks",
    authors: "Ben R. Hodges",
    year: 2020,
    venue:
      "World Environmental & Water Resources Congress (EWRI) — invited paper",
    url: "https://ascelibrary.org/doi/10.1061/9780784482971",
    summary:
      "Diagnoses the failure modes (oscillation, mass loss, time-step collapse) of the EPA SWMM5 dynamic wave on networks > ~10⁴ links and motivates the move to a conservative FV formulation.",
    relatedSubsystems: ["hydraulics", "interface"],
    relatedModules: ["runge_kutta2", "interface"],
  },
  {
    id: "junction-energy",
    title:
      "Junction representation for finite-volume stormwater models",
    authors: "Hodges, Liu, et al.",
    year: 2023,
    venue: "Journal of Hydroinformatics",
    url: "https://doi.org/10.2166/hydro.2023.001",
    summary:
      "Proposes the volume-conserving junction element used in SWMM5+ — a 'first-class' FV node with its own storage and overflow handling, replacing EPA SWMM's iterative node-link coupling.",
    relatedSubsystems: ["hydraulics", "network"],
    relatedModules: ["junction_elements", "junction_lowlevel"],
  },
  {
    id: "epa-coupling",
    title:
      "Coupling a Fortran finite-volume hydraulics engine to the EPA SWMM5 C runtime",
    authors: "Hodges, Jenkins, Yu",
    year: 2022,
    venue: "CIMM technical report",
    url: "https://cimm.utexas.edu/publications",
    summary:
      "Documents the ISO_C_BINDING interface that lets SWMM5+ delegate input parsing, hydrology, and RTC rule evaluation to the unmodified EPA SWMM5 C code while taking over hydraulics.",
    relatedSubsystems: ["interface", "hydrology"],
    relatedModules: ["interface", "c_library", "define_api_keys", "control_hydraulics"],
  },
];
