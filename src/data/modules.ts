import type { SubsystemId } from "./subsystems";

/**
 * How a SWMM5+ Fortran module relates to its counterpart in the EPA
 * SWMM C runtime that SWMM5+ actually links against (v5.1.13).
 */
export type CRelation =
  | "direct-port"
  | "functional-analogue"
  | "centralized-equivalent"
  | "shared-concept"
  | "wrapper"
  | "extension"
  | "new-in-swmm5plus";

export type CConfidence = "high" | "medium" | "low";

export interface ModuleNode {
  id: string;
  label: string;
  path: string;
  subsystem: SubsystemId;
  summary: string;
  uses: string[];
  cEquivalent?: {
    file: string;        // EPA SWMM C source file (v5.1.13). "—" = truly no counterpart.
    symbol?: string;
    notes?: string;
    relation?: CRelation;
    confidence?: CConfidence;
    reviewed?: boolean;
  };
}

/**
 * Curated module catalog. Edges are hand-picked from the most meaningful
 * `use` relationships — not a mechanical Fortran-parser dump.
 */
export const MODULES: ModuleNode[] = [
  // ── main / init ──────────────────────────────────────────────────────
  {
    id: "main",
    label: "main",
    path: "main/main.f90",
    subsystem: "init",
    summary: "PROGRAM SWMM. Sequences initialize → timeloop → finalize.",
    uses: ["initialization", "timeloop", "finalization", "define_settings"],
    cEquivalent: { file: "src/run/main.c", symbol: "main()", notes: "EPA SWMM5 has a similar 3-stage entry point: swmm_open / swmm_start / swmm_step loop / swmm_end / swmm_close in src/run/main.c." },
  },
  {
    id: "initialization",
    label: "initialization",
    path: "initialization/initialization.f90",
    subsystem: "init",
    summary: "Top-level setup: settings, C-engine open, network read, partition, discretize, IC.",
    uses: ["interface", "network_define", "partitioning", "discretization", "initial_condition", "utility_allocate", "define_settings"],
    cEquivalent: { file: "src/solver/swmm5.c", symbol: "swmm_open / project_open", notes: "EPA SWMM combines this with project_open in project.c; SWMM5+ wraps that call then adds its own network-build and partition stages." },
  },
  {
    id: "network_define",
    label: "network_define",
    path: "initialization/network_define.f90",
    subsystem: "init",
    summary: "Translates link-node topology from the C engine into SWMM5+'s element/face arrays.",
    uses: ["interface", "define_indexes", "define_keys", "utility_allocate"],
    cEquivalent: { file: "src/solver/link.c", symbol: "link_init / link_setParams", notes: "EPA SWMM keeps link/node objects as-is; SWMM5+ re-meshes each link into FV elements, so this is an additional layer with no direct EPA equivalent." },
  },
  {
    id: "discretization",
    label: "discretization",
    path: "initialization/discretization.f90",
    subsystem: "init",
    summary: "Splits each conduit into N finite-volume elements using NominalElemLength.",
    uses: ["define_settings", "define_indexes"],
    cEquivalent: { file: "src/solver/dynwave.c", symbol: "(implicit)", notes: "EPA SWMM dynamic wave treats each conduit as a single segment between two nodes — no FV discretization step exists." },
  },
  {
    id: "partitioning",
    label: "partitioning",
    path: "initialization/partitioning.f90",
    subsystem: "init",
    summary: "Selects partitioning strategy and assigns elements to coarray images.",
    uses: ["BIPquick", "define_settings"],
    cEquivalent: { file: "—", relation: "new-in-swmm5plus", confidence: "high", reviewed: true, notes: "EPA SWMM does not implement distributed / coarray SPMD partitioning; its dynamic-wave solver uses shared-memory OpenMP across links (see USEPA/Stormwater-Management-Model src/solver/dynwave.c). SWMM5+'s network partitioner across coarray images is genuinely new." },
  },
  {
    id: "BIPquick",
    label: "BIPquick",
    path: "initialization/BIPquick.f90",
    subsystem: "init",
    summary: "Balanced Iterative Partitioning of the link-node graph for load-balanced parallel runs.",
    uses: ["define_indexes", "utility_array"],
    cEquivalent: { file: "—", relation: "new-in-swmm5plus", confidence: "high", reviewed: true, notes: "No EPA equivalent — EPA SWMM does not perform network partitioning of any kind. Inspired by graph-partitioning literature; documented in the Hodges & Liu papers." },
  },
  {
    id: "initial_condition",
    label: "initial_condition",
    path: "initialization/initial_condition.f90",
    subsystem: "init",
    summary: "Cold-start or hotstart fill of element/face state before the time loop.",
    uses: ["ic_lowlevel", "geometry", "define_settings"],
    cEquivalent: { file: "src/solver/hotstart.c", notes: "EPA SWMM has hotstart.c for restart files; SWMM5+ initial_condition does both cold and hot start at the FV-element granularity." },
  },
  {
    id: "ic_lowlevel",
    label: "ic_lowlevel",
    path: "initialization/ic_lowlevel.f90",
    subsystem: "init",
    summary: "Per-element/per-face IC kernels (depth, area, flowrate, geometry consistency).",
    uses: ["geometry_lowlevel", "define_indexes"],
  },
  {
    id: "pack_mask_arrays",
    label: "pack_mask_arrays",
    path: "initialization/pack_mask_arrays.f90",
    subsystem: "init",
    summary: "Pre-builds packed index arrays (only-CC, only-diagnostic, …) to keep the time-loop branch-free.",
    uses: ["define_indexes", "utility_array"],
    cEquivalent: { file: "—", notes: "EPA SWMM iterates linked lists of nodes/links each step — no packed-index analogue." },
  },

  // ── interface (C bridge) ─────────────────────────────────────────────
  {
    id: "interface",
    label: "interface",
    path: "interface/interface.f90",
    subsystem: "interface",
    summary: "High-level Fortran wrappers around the EPA SWMM5 C API.",
    uses: ["c_library", "define_api_keys"],
    cEquivalent: { file: "src/solver/swmm5.c", symbol: "swmm_open / swmm_step / swmm_close", notes: "This module IS the binding to the EPA C engine; the C side is unchanged EPA SWMM5." },
  },
  {
    id: "c_library",
    label: "c_library",
    path: "interface/c_library.f90",
    subsystem: "interface",
    summary: "ISO_C_BINDING declarations of every C function reached from Fortran.",
    uses: [],
    cEquivalent: { file: "src/solver/include/swmm5.h", notes: "Mirrors swmm5.h exports plus the extra api_*() helpers added to the bundled C." },
  },
  {
    id: "define_api_keys",
    label: "define_api_keys",
    path: "definitions/define_api_keys.f90",
    subsystem: "interface",
    summary: "Integer keys that match the C enum so both engines agree on object/property IDs.",
    uses: [],
    cEquivalent: { file: "src/solver/enums.h", notes: "Hand-mirrors enums.h — they must stay in lock-step." },
  },

  // ── definitions / utility ────────────────────────────────────────────
  { id: "define_globals", label: "define_globals", path: "definitions/define_globals.f90", subsystem: "utility", summary: "Global constants (gravity, π, default units, file unit numbers).", uses: [], cEquivalent: { file: "src/solver/consts.h", notes: "Same role." } },
  { id: "define_indexes", label: "define_indexes", path: "definitions/define_indexes.f90", subsystem: "utility", summary: "Column indexes into element/face/link/node coarrays — the runtime data schema.", uses: [], cEquivalent: { file: "src/solver/objects.h", notes: "EPA SWMM uses structs; SWMM5+ uses big 2-D arrays indexed by these symbolic columns." } },
  { id: "define_keys",    label: "define_keys",    path: "definitions/define_keys.f90",    subsystem: "utility", summary: "Symbolic enums for element types, geometry shapes, march schemes, BC types.", uses: [], cEquivalent: { file: "src/solver/enums.h" } },
  { id: "define_settings",label: "define_settings",path: "definitions/define_settings.f90",subsystem: "utility", summary: "The `setting` derived-type tree — every JSON knob lands here.", uses: ["define_keys"], cEquivalent: { file: "src/solver/globals.h", notes: "EPA SWMM globals are loose externs; SWMM5+ namespaces everything under one derived type." } },
  { id: "define_types",   label: "define_types",   path: "definitions/define_types.f90",   subsystem: "utility", summary: "Derived types for transects, controls, profiler frames, partitioning records.", uses: [] },
  { id: "define_xsect_tables", label: "define_xsect_tables", path: "definitions/define_xsect_tables.f90", subsystem: "network", summary: "Dimensionless lookup tables for non-prismatic cross-sections.", uses: [], cEquivalent: { file: "src/solver/xsect.dat / xsect.c", notes: "Same tables, ported once at code-gen time." } },

  { id: "utility",             label: "utility",             path: "utility/utility.f90",             subsystem: "utility", summary: "Misc helpers (sign, clipping, safe-div, image-aware sync).", uses: [] },
  { id: "utility_allocate",    label: "utility_allocate",    path: "utility/utility_allocate.f90",    subsystem: "utility", summary: "Allocates the big coarrays once the partition is known.", uses: ["define_indexes", "define_settings"] },
  { id: "utility_deallocate",  label: "utility_deallocate",  path: "utility/utility_deallocate.f90",  subsystem: "utility", summary: "Mirror deallocation at finalize.", uses: ["define_indexes"] },
  { id: "utility_array",       label: "utility_array",       path: "utility/utility_array.f90",       subsystem: "utility", summary: "Array helpers (sort, unique, search, pack).", uses: [] },
  { id: "utility_crash",       label: "utility_crash",       path: "utility/utility_crash.f90",       subsystem: "utility", summary: "Centralized error-stop with image-aware diagnostic printout.", uses: [] },
  { id: "utility_datetime",    label: "utility_datetime",    path: "utility/utility_datetime.f90",    subsystem: "utility", summary: "Datetime arithmetic mirroring EPA SWMM datetime.c.", uses: [], cEquivalent: { file: "src/solver/datetime.c", notes: "Direct port — same calendar / Julian conversions." } },
  { id: "utility_debug",       label: "utility_debug",       path: "utility/utility_debug.f90",       subsystem: "utility", summary: "Conditional debug printouts gated by settings flags.", uses: ["define_settings"] },
  { id: "utility_files",       label: "utility_files",       path: "utility/utility_files.f90",       subsystem: "utility", summary: "Filename/path handling, output-directory creation.", uses: [] },
  { id: "utility_interpolate", label: "utility_interpolate", path: "utility/utility_interpolate.f90", subsystem: "utility", summary: "1-D table interpolation used by transects, ratings, time series.", uses: [], cEquivalent: { file: "src/solver/table.c", notes: "EPA SWMM table.c plays the same role." } },
  { id: "utility_key_default", label: "utility_key_default", path: "utility/utility_key_default.f90", subsystem: "utility", summary: "Default settings before the JSON is read.", uses: ["define_settings"] },
  { id: "utility_output",      label: "utility_output",      path: "utility/utility_output.f90",      subsystem: "output",  summary: "Low-level HDF5/CSV writers.", uses: ["define_indexes"], cEquivalent: { file: "src/solver/output.c", notes: "Both buffer per-step results and flush; EPA writes the .out binary, SWMM5+ writes HDF5+CSV." } },
  { id: "utility_profiler",    label: "utility_profiler",    path: "utility/utility_profiler.f90",    subsystem: "utility", summary: "Lightweight section timing.", uses: [] },
  { id: "utility_string",      label: "utility_string",      path: "utility/utility_string.f90",      subsystem: "utility", summary: "String helpers Fortran doesn't have built-in.", uses: [] },
  { id: "utility_unit_testing",label: "utility_unit_testing",path: "utility/utility_unit_testing.f90",subsystem: "utility", summary: "Inline assertions used by ctest.", uses: [] },

  // ── geometry ─────────────────────────────────────────────────────────
  {
    id: "geometry",
    label: "geometry",
    path: "geometry/geometry.f90",
    subsystem: "network",
    summary: "Per-element shape dispatcher: depth ⇄ area ⇄ topwidth ⇄ perimeter.",
    uses: [
      "geometry_lowlevel", "circular_conduit", "rectangular_channel", "rectangular_conduit",
      "trapezoidal_channel", "triangular_channel", "parabolic_channel", "irregular_channel",
      "storage_geometry", "xsect_tables", "define_indexes",
    ],
    cEquivalent: { file: "src/solver/xsect.c", symbol: "xsect_getAofY / xsect_getYofA", notes: "EPA SWMM xsect.c centralizes every shape; SWMM5+ splits each shape into its own module for clarity and per-shape Preissmann-slot handling." },
  },
  { id: "geometry_lowlevel",   label: "geometry_lowlevel",   path: "geometry/geometry_lowlevel.f90",   subsystem: "network", summary: "Shared geometry helpers (hyd-radius, slot adjustments).", uses: ["define_settings"] },
  { id: "circular_conduit",    label: "circular_conduit",    path: "geometry/circular_conduit.f90",    subsystem: "network", summary: "Closed circular pipe with Preissmann-slot extension.", uses: ["geometry_lowlevel", "xsect_tables", "preissmann_slot"], cEquivalent: { file: "src/solver/xsect.c", symbol: "CIRCULAR section", notes: "EPA SWMM uses the same dimensionless tables; SWMM5+ adds explicit slot handling." } },
  { id: "filled_circular_conduit", label: "filled_circular_conduit", path: "geometry/filled_circular_conduit.f90", subsystem: "network", summary: "Circular pipe with sediment fill at invert.", uses: ["circular_conduit", "geometry_lowlevel"], cEquivalent: { file: "src/solver/xsect.c", symbol: "FILLED_CIRCULAR", relation: "centralized-equivalent", confidence: "high", reviewed: true, notes: "EPA SWMM implements FILLED_CIRCULAR inside xsect.c's shape dispatcher; SWMM5+ splits it into a dedicated module." } },
  { id: "forcemain",           label: "forcemain",           path: "geometry/forcemain.f90",           subsystem: "network", summary: "Force-main always-pressurized conduit treatment.", uses: ["geometry_lowlevel", "preissmann_slot"], cEquivalent: { file: "src/solver/forcmain.c", relation: "shared-concept", confidence: "medium" } },
  { id: "irregular_channel",   label: "irregular_channel",   path: "geometry/irregular_channel.f90",   subsystem: "network", summary: "User transect channels with depth/area/width interpolation.", uses: ["utility_interpolate", "define_types"], cEquivalent: { file: "src/solver/transect.c", relation: "functional-analogue", confidence: "medium" } },
  { id: "mod_basket_conduit",  label: "mod_basket_conduit",  path: "geometry/mod_basket_conduit.f90",  subsystem: "network", summary: "Modified basket-handle conduit.", uses: ["xsect_tables", "geometry_lowlevel"], cEquivalent: { file: "src/solver/xsect.c", symbol: "MOD_BASKET", relation: "centralized-equivalent", confidence: "high", reviewed: true, notes: "EPA SWMM implements MOD_BASKET inside xsect.c." } },
  { id: "parabolic_channel",   label: "parabolic_channel",   path: "geometry/parabolic_channel.f90",   subsystem: "network", summary: "Parabolic open channel.", uses: ["geometry_lowlevel"], cEquivalent: { file: "src/solver/xsect.c", symbol: "PARABOLIC", relation: "centralized-equivalent", confidence: "high", reviewed: true, notes: "EPA SWMM implements PARABOLIC inside xsect.c." } },
  { id: "powerfunction_channel", label: "powerfunction_channel", path: "geometry/powerfunction_channel.f90", subsystem: "network", summary: "Power-function open channel y = a·xᵇ.", uses: ["geometry_lowlevel"], cEquivalent: { file: "src/solver/xsect.c", symbol: "POWERFUNC", relation: "centralized-equivalent", confidence: "high", reviewed: true, notes: "EPA SWMM implements POWERFUNC inside xsect.c." } },
  { id: "rectangular_channel", label: "rectangular_channel", path: "geometry/rectangular_channel.f90", subsystem: "network", summary: "Open rectangular channel.", uses: ["geometry_lowlevel"], cEquivalent: { file: "src/solver/xsect.c", symbol: "RECT_OPEN", relation: "centralized-equivalent", confidence: "high", reviewed: true, notes: "EPA SWMM implements RECT_OPEN inside xsect.c." } },
  { id: "rectangular_conduit", label: "rectangular_conduit", path: "geometry/rectangular_conduit.f90", subsystem: "network", summary: "Closed rectangular conduit with slot.", uses: ["geometry_lowlevel", "preissmann_slot"], cEquivalent: { file: "src/solver/xsect.c", symbol: "RECT_CLOSED", relation: "centralized-equivalent", confidence: "high", reviewed: true, notes: "EPA SWMM implements RECT_CLOSED inside xsect.c; SWMM5+ adds explicit Preissmann-slot bookkeeping." } },
  { id: "rectangular_round_conduit",     label: "rectangular_round_conduit",     path: "geometry/rectangular_round_conduit.f90",     subsystem: "network", summary: "Rectangular conduit with rounded bottom.", uses: ["geometry_lowlevel", "xsect_tables"], cEquivalent: { file: "src/solver/xsect.c", symbol: "RECT_ROUND", relation: "centralized-equivalent", confidence: "high", reviewed: true, notes: "EPA SWMM implements RECT_ROUND inside xsect.c." } },
  { id: "rectangular_triangular_conduit",label: "rectangular_triangular_conduit",path: "geometry/rectangular_triangular_conduit.f90",subsystem: "network", summary: "Rectangular conduit with triangular bottom.", uses: ["geometry_lowlevel", "xsect_tables"], cEquivalent: { file: "src/solver/xsect.c", symbol: "RECT_TRIANG", relation: "centralized-equivalent", confidence: "high", reviewed: true, notes: "EPA SWMM implements RECT_TRIANG inside xsect.c." } },
  { id: "storage_geometry",    label: "storage_geometry",    path: "geometry/storage_geometry.f90",    subsystem: "network", summary: "Storage-node depth-area/depth-volume curves.", uses: ["utility_interpolate"], cEquivalent: { file: "src/solver/node.c", symbol: "node_getStorageVolume", relation: "functional-analogue", confidence: "medium" } },
  { id: "trapezoidal_channel", label: "trapezoidal_channel", path: "geometry/trapezoidal_channel.f90", subsystem: "network", summary: "Trapezoidal open channel.", uses: ["geometry_lowlevel"], cEquivalent: { file: "src/solver/xsect.c", symbol: "TRAPEZOIDAL", relation: "centralized-equivalent", confidence: "high", reviewed: true, notes: "EPA SWMM implements TRAPEZOIDAL inside xsect.c." } },
  { id: "triangular_channel",  label: "triangular_channel",  path: "geometry/triangular_channel.f90",  subsystem: "network", summary: "Triangular V-shape channel.", uses: ["geometry_lowlevel"], cEquivalent: { file: "src/solver/xsect.c", symbol: "TRIANGULAR", relation: "centralized-equivalent", confidence: "high", reviewed: true, notes: "EPA SWMM implements TRIANGULAR inside xsect.c." } },
  { id: "xsect_tables",        label: "xsect_tables",        path: "geometry/xsect_tables.f90",        subsystem: "network", summary: "Generic dimensionless-table lookup engine.", uses: ["define_xsect_tables", "utility_interpolate"], cEquivalent: { file: "src/solver/xsect.c" } },

  // ── special elements ─────────────────────────────────────────────────
  {
    id: "diagnostic_elements",
    label: "diagnostic_elements",
    path: "special_elements/diagnostic_elements.f90",
    subsystem: "hydraulics",
    summary: "Dispatcher for elements whose flow is set by a rating curve, not the momentum solver.",
    uses: ["common_elements", "weir_elements", "orifice_elements", "pump_elements", "outlet_elements", "culvert_elements"],
    cEquivalent: { file: "src/solver/link.c", symbol: "link_getInflow", notes: "EPA SWMM dispatches link types inside link.c with switch(link.type); SWMM5+ separates them as 'diagnostic' elements outside the FV solver." },
  },
  { id: "common_elements",    label: "common_elements",    path: "special_elements/common_elements.f90",    subsystem: "hydraulics", summary: "Shared helpers for all diagnostic/special elements.", uses: ["define_indexes"] },
  { id: "control_hydraulics", label: "control_hydraulics", path: "special_elements/control_hydraulics.f90", subsystem: "hydraulics", summary: "RTC rule evaluation; delegates to EPA SWMM controls.c.", uses: ["interface", "define_settings"], cEquivalent: { file: "src/solver/controls.c" } },
  { id: "culvert_elements",   label: "culvert_elements",   path: "special_elements/culvert_elements.f90",   subsystem: "hydraulics", summary: "FHWA culvert inlet/outlet control rating.", uses: ["common_elements"], cEquivalent: { file: "src/solver/culvert.c" } },
  { id: "jump",               label: "jump",               path: "special_elements/jump.f90",               subsystem: "hydraulics", summary: "Hydraulic-jump detection across element faces.", uses: ["define_indexes"] },
  { id: "orifice_elements",   label: "orifice_elements",   path: "special_elements/orifice_elements.f90",   subsystem: "hydraulics", summary: "Orifice rating (side/bottom, circular/rect).", uses: ["common_elements"], cEquivalent: { file: "src/solver/link.c", symbol: "orifice_getInflow" } },
  { id: "outlet_elements",    label: "outlet_elements",    path: "special_elements/outlet_elements.f90",    subsystem: "hydraulics", summary: "User-defined outlet rating curves.", uses: ["common_elements", "utility_interpolate"], cEquivalent: { file: "src/solver/link.c", symbol: "outlet_getInflow" } },
  { id: "pump_elements",      label: "pump_elements",      path: "special_elements/pump_elements.f90",      subsystem: "hydraulics", summary: "Pump curves (types 1–4) and on/off depth triggers.", uses: ["common_elements", "utility_interpolate"], cEquivalent: { file: "src/solver/link.c", symbol: "pump_getInflow" } },
  { id: "roadway_weir_elements", label: "roadway_weir_elements", path: "special_elements/roadway_weir_elements.f90", subsystem: "hydraulics", summary: "FHWA roadway overtopping weir.", uses: ["common_elements"], cEquivalent: { file: "src/solver/roadway.c" } },
  { id: "weir_elements",      label: "weir_elements",      path: "special_elements/weir_elements.f90",      subsystem: "hydraulics", summary: "Transverse / side-flow / V-notch / trapezoidal weirs.", uses: ["common_elements"], cEquivalent: { file: "src/solver/link.c", symbol: "weir_getInflow" } },

  // ── timeloop / FV solver ─────────────────────────────────────────────
  {
    id: "timeloop",
    label: "timeloop",
    path: "timeloop/timeloop.f90",
    subsystem: "timeloop",
    summary: "Outer hydraulics/hydrology time loop with adaptive dt and coupling.",
    uses: ["runge_kutta2", "boundary_conditions", "interface", "output", "utility_profiler", "define_settings"],
    cEquivalent: { file: "src/solver/routing.c", symbol: "routing_execute", relation: "functional-analogue", confidence: "medium", reviewed: true, notes: "Both orchestrate the routing step. EPA SWMM: implicit iterative dynamic-wave with an OPTIONAL variable step (Courant factor). SWMM5+: explicit FV RK2 with a CFL-constrained adaptive step integral to numerical stability. The contrast is the numerical role of the adaptive step, not fixed-vs-adaptive." },
  },
  {
    id: "runge_kutta2",
    label: "runge_kutta2",
    path: "timeloop/runge_kutta2.f90",
    subsystem: "hydraulics",
    summary: "RK2 stage controller — orders face → element → junction → diagnostic updates.",
    uses: ["rk2_lowlevel", "face", "update", "adjust", "junction_elements", "diagnostic_elements", "preissmann_slot", "air_entrapment"],
    cEquivalent: { file: "src/solver/dynwave.c", symbol: "dynwave_execute", notes: "EPA dynamic wave is a node-link iterative solver, not a finite-volume RK scheme — the algorithm is structurally different." },
  },
  { id: "rk2_lowlevel",       label: "rk2_lowlevel",       path: "timeloop/rk2_lowlevel.f90",       subsystem: "hydraulics", summary: "RK2 continuity + momentum kernels per element.", uses: ["define_indexes", "geometry_lowlevel"] },
  {
    id: "face",
    label: "face",
    path: "timeloop/face.f90",
    subsystem: "hydraulics",
    summary: "Face-centered flux reconstruction between elements — the FV crux.",
    uses: ["define_indexes", "geometry_lowlevel"],
    cEquivalent: { file: "src/solver/dwflow.c", symbol: "dwflow_findConduitFlow", notes: "Both solve the momentum equation on a 'link face'; SWMM5+ uses an upwinded FV flux instead of EPA's iterative discretization on the conduit as one segment." },
  },
  { id: "update",             label: "update",             path: "timeloop/update.f90",             subsystem: "hydraulics", summary: "Post-stage update of derived quantities from conserved variables.", uses: ["geometry", "define_indexes"] },
  { id: "adjust",             label: "adjust",             path: "timeloop/adjust.f90",             subsystem: "hydraulics", summary: "Limiting/clipping near zero depth/flow to keep the scheme stable.", uses: ["define_settings", "define_indexes"] },
  {
    id: "preissmann_slot",
    label: "preissmann_slot",
    path: "timeloop/preissmann_slot.f90",
    subsystem: "hydraulics",
    summary: "Preissmann-slot pressurization: free-surface solver represents surcharged closed conduits.",
    uses: ["define_settings", "geometry_lowlevel"],
    cEquivalent: { file: "src/solver/dwflow.c", symbol: "Slot (#define)", notes: "EPA SWMM5 added Preissmann slot in v5.1+; same concept, different bookkeeping." },
  },
  {
    id: "junction_elements",
    label: "junction_elements",
    path: "timeloop/junction_elements.f90",
    subsystem: "hydraulics",
    summary: "Volume-conserving junction update connecting incident conduits.",
    uses: ["junction_lowlevel", "define_indexes"],
    cEquivalent: { file: "src/solver/node.c", symbol: "node_getOutflow", notes: "EPA SWMM nodes are storage points solved iteratively with adjacent links; SWMM5+ junctions are first-class FV junction elements." },
  },
  { id: "junction_lowlevel",  label: "junction_lowlevel",  path: "timeloop/junction_lowlevel.f90",  subsystem: "hydraulics", summary: "Per-junction kernels (head/volume balance, overflow ponding).", uses: ["define_indexes"] },
  {
    id: "boundary_conditions",
    label: "boundary_conditions",
    path: "timeloop/boundary_conditions.f90",
    subsystem: "hydraulics",
    summary: "External inflows and head/tide outfalls — fed by the C engine's time series.",
    uses: ["interface", "utility_interpolate"],
    cEquivalent: { file: "src/solver/inflow.c", notes: "EPA SWMM evaluates time series in inflow.c / climate.c — SWMM5+ pulls these values through the C interface." },
  },
  {
    id: "air_entrapment",
    label: "air_entrapment",
    path: "timeloop/air_entrapment.f90",
    subsystem: "hydraulics",
    summary: "Trapped-air pocket model for surcharged tunnels — a SWMM5+ research contribution.",
    uses: ["define_settings", "preissmann_slot"],
    cEquivalent: { file: "—", relation: "new-in-swmm5plus", confidence: "high", reviewed: true, notes: "No EPA equivalent — air-water two-phase modeling is unique to SWMM5+." },
  },

  // ── main output ──────────────────────────────────────────────────────
  {
    id: "output",
    label: "output",
    path: "main/output.f90",
    subsystem: "output",
    summary: "Element/face/link/node result writers, HDF5 layout, CSV reports.",
    uses: ["utility_output", "define_indexes", "define_settings"],
    cEquivalent: { file: "src/solver/output.c", notes: "EPA writes a custom binary .out + a text .rpt; SWMM5+ writes HDF5 plus CSV, per coarray image, combined at finalize." },
  },
  {
    id: "finalization",
    label: "finalization",
    path: "main/finalization.f90",
    subsystem: "output",
    summary: "Closes the C engine, flushes HDF5/CSV, combines per-image files, prints summary.",
    uses: ["interface", "output", "utility_deallocate", "utility_profiler"],
    cEquivalent: { file: "src/solver/swmm5.c", symbol: "swmm_end / swmm_close" },
  },
];

export const MODULES_BY_ID: Record<string, ModuleNode> = Object.fromEntries(
  MODULES.map((m) => [m.id, m]),
);
