import type { SubsystemId } from "./subsystems";

/**
 * How strongly a paper is tied to the SWMM5+ implementation:
 *  - implementation-source: paper explicitly describes this SWMM5+ algorithm
 *  - direct-basis:          module implements equations from this paper
 *  - author-cited-context:  SWMM5+ authors cite this paper as background
 *  - explorer-inference:    relationship inferred here, not stated upstream
 */
export type EvidenceLevel =
  | "implementation-source"
  | "direct-basis"
  | "author-cited-context"
  | "explorer-inference";

export interface Paper {
  id: string;
  title: string;
  authors: string;
  year: number;
  venue: string;
  url: string;
  summary: string;
  relatedSubsystems: SubsystemId[];
  relatedModules?: string[];
  primary?: boolean;
  evidenceLevel?: EvidenceLevel;
}

/**
 * Beta / research-status caveat straight from the 2024 introduction paper.
 * Surfaced prominently on the papers and overview pages so downstream
 * readers don't mistake SWMM5+ for production-ready software.
 */
export const RESEARCH_STATUS_NOTICE =
  "The SWMM5+ authors state (Hodges 2024, J. Env. Eng.) that SWMM5+ remains research software, may contain hidden bugs around complex hydraulic components, and requires further testing and debugging before general production use.";

/**
 * Curated reading list of Hodges (and close collaborators') papers that
 * directly informed SWMM5+. Citations verified against HESS / MDPI Water /
 * ASCE / Springer / NSF PAR (Nov 2024). Authorship on the 2024 intro paper
 * expanded to include the full co-author list on the DOI record.
 */
export const PAPERS: Paper[] = [
  {
    id: "hodges2019-hess",
    primary: true,
    title:
      "Conservative finite-volume forms of the Saint-Venant equations for hydrology and urban drainage",
    authors: "Ben R. Hodges",
    year: 2019,
    venue: "Hydrology and Earth System Sciences (HESS) 23(3): 1281–1304",
    url: "https://doi.org/10.5194/hess-23-1281-2019",
    summary:
      "Derives the integral, flux-conservative finite-volume form of the 1-D Saint-Venant equations used as the mathematical foundation of SWMM5+. By shifting parts of the hydrostatic-pressure and gravity source terms into the flux, the discretization conserves momentum exactly across hydraulic jumps without bespoke shock capturing.",
    relatedSubsystems: ["hydraulics", "timeloop"],
    relatedModules: ["face", "rk2_lowlevel", "runge_kutta2"],
  },
  {
    id: "hodges-liu-2019-jhr",
    title:
      "Timescale interpolation and no-neighbour discretization for a 1-D finite-volume Saint-Venant solver",
    authors: "Ben R. Hodges, Frank Liu",
    year: 2019,
    venue: "Journal of Hydraulic Research",
    url: "https://doi.org/10.1080/00221686.2019.1671510",
    summary:
      "Introduces a 'timescale interpolation' face scheme that transitions smoothly between sub- and supercritical conditions without a Riemann solver, and a 'no-neighbour' stencil that avoids two-step communication. Both choices are what make the SWMM5+ FV solver friendly to coarray parallelism.",
    relatedSubsystems: ["hydraulics"],
    relatedModules: ["face"],
  },
  {
    id: "hodges-2020-mdpi",
    title:
      "An artificial compressibility method for 1-D simulation of open-channel and pressurised-pipe flow",
    authors: "Ben R. Hodges",
    year: 2020,
    venue: "Water (MDPI) 12(6): 1727",
    url: "https://doi.org/10.3390/w12061727",
    summary:
      "Proposes an artificial-compressibility alternative to the Preissmann slot for the free-surface ⇄ pressurised transition in sewers. The analysis directly motivates the surcharge-handling choices made in SWMM5+'s preissmann_slot module.",
    relatedSubsystems: ["hydraulics"],
    relatedModules: ["preissmann_slot"],
  },
  {
    id: "yu-hodges-liu-2020-hess",
    title:
      "A new form of the Saint-Venant equations for variable topography",
    authors: "Cheng-Wei Yu, Ben R. Hodges, Frank Liu",
    year: 2020,
    venue: "Hydrology and Earth System Sciences (HESS) 24(8): 4001–4024",
    url: "https://doi.org/10.5194/hess-24-4001-2020",
    summary:
      "Extends the conservative FV SVE form to networks with non-prismatic, irregular topography by enforcing Lipschitz smoothness on the bed-slope source. Underpins SWMM5+'s handling of surveyed transects and storage geometry.",
    relatedSubsystems: ["hydraulics", "network"],
    relatedModules: ["irregular_channel", "storage_geometry", "rk2_lowlevel"],
  },
  {
    id: "hodges-2024-jee",
    primary: true,
    evidenceLevel: "implementation-source",
    title: "Introducing SWMM5+",
    authors:
      "Ben R. Hodges, Sazzad Sharior, Edward Tiernan, Eric Jenkins, Gerardo Riaño-Briceño, Cesar Davila-Hernandez, Ehsan Madadi-Kandjani, Cheng-Wei Yu",
    year: 2024,
    venue: "Journal of Environmental Engineering (ASCE) 150(10)",
    url: "https://doi.org/10.1061/JOEEDU.EEENG-7680",
    summary:
      "Official public introduction of the SWMM5+ beta. Documents the coarray-Fortran SPMD architecture, the RK2 FV solver with adaptive CFL < √2/2 stepping, the Preissmann slot for surcharge, the JSON/HDF5 I/O, and an honest estimate of when SWMM5+ will out-pace EPA SWMM (≥32 processors, ≥~160k FV elements). The paper explicitly notes that SWMM5+ remains research software requiring further testing.",
    relatedSubsystems: ["init", "hydraulics", "timeloop", "interface", "output"],
    relatedModules: ["main", "initialization", "interface", "runge_kutta2", "output"],
  },
  {
    id: "sharior-hodges-2023-slot",
    title:
      "Generalized, Dynamic, and Transient-Storage Form of the Preissmann Slot",
    authors: "Sazzad Sharior, Ben R. Hodges, et al.",
    year: 2023,
    venue: "NSF Public Access Repository (par.nsf.gov/biblio/10529833)",
    url: "https://par.nsf.gov/biblio/10529833",
    summary:
      "Generalises the classical Preissmann slot with a dynamic, transient-storage formulation that avoids the artificial-storage artefact at the pipe crown. This is the slot algorithm implemented in SWMM5+'s preissmann_slot.f90.",
    relatedSubsystems: ["hydraulics"],
    relatedModules: ["preissmann_slot", "circular_conduit", "rectangular_conduit"],
  },
  {
    id: "hodges-rowney-2018-icwmm",
    title:
      "Foundations for multi-thread parallel computation in stormwater network models",
    authors: "Ben R. Hodges, A. C. Rowney",
    year: 2018,
    venue: "51st International Conference on Water Management Modeling (ICWMM), Toronto",
    url: "https://www.chijournal.org/C470",
    summary:
      "Lays out the theoretical groundwork for parallelising stormwater models. Argues that the sparse pipe-junction graph (≈3–4 connections/node) maps cleanly onto SPMD coarray parallelism and identifies the practical granularity limits set by the Courant condition.",
    relatedSubsystems: ["init", "timeloop"],
    relatedModules: ["partitioning", "BIPquick"],
  },
  {
    id: "hodges-liu-rowney-2018-udm",
    title: "A new Saint-Venant solver for SWMM",
    authors: "Ben R. Hodges, Frank Liu, A. Charles Rowney",
    year: 2018,
    venue: "11th International Conference on Urban Drainage Modelling (UDM), Palermo. Springer, pp. 582–586",
    url: "https://doi.org/10.1007/978-3-319-99867-1_100",
    summary:
      "First public description of the SWMM5+ prototype. Frames the problem (instability of EPA SWMM's implicit dynamic-wave on large networks) and the proposed fix: subdivide each link into FV cells and use a conservative explicit solver with a custom face scheme.",
    relatedSubsystems: ["hydraulics", "init", "interface"],
    relatedModules: ["discretization", "runge_kutta2"],
  },
  {
    id: "hodges-schmidt-2019-ewri",
    title:
      "Progress on a new engine for the Storm Water Management Model (SWMM)",
    authors: "Ben R. Hodges, Kevin M. Schmidt",
    year: 2019,
    venue: "World Environmental & Water Resources Congress, Pittsburgh PA",
    url: "https://ascelibrary.org/doi/10.1061/9780784482346",
    summary:
      "Progress report on the Fortran 2008 implementation. Introduces BIPquick as the network partitioner and reports early benchmarks of the coarray solver against EPA SWMM on simple networks.",
    relatedSubsystems: ["init"],
    relatedModules: ["BIPquick", "partitioning", "interface"],
  },
  {
    id: "morales-hernandez-2020-jhi",
    title:
      "High performance computing in water resources hydrodynamics",
    authors:
      "Mario Morales-Hernández et al. (incl. Ben R. Hodges)",
    year: 2020,
    venue: "Journal of Hydroinformatics 22(5): 1217–1235",
    url: "https://doi.org/10.2166/hydro.2020.163",
    summary:
      "Survey of HPC approaches (MPI, GPU, cloud) in hydrodynamic modelling. Contextualises the SWMM5+ choice of explicit FV + coarray SPMD against implicit-iterative alternatives that parallelise poorly.",
    relatedSubsystems: ["init", "timeloop"],
    relatedModules: ["partitioning", "timeloop"],
  },
];
