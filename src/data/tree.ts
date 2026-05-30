import type { SubsystemId } from "./subsystems";

export interface TreeNode {
  name: string;
  path: string;
  kind: "dir" | "file";
  subsystem?: SubsystemId;
  description?: string;
  children?: TreeNode[];
}

export const REPO_TREE: TreeNode = {
  name: "SWMM5plus-1",
  path: "",
  kind: "dir",
  description:
    "Prototype Fortran 2008 engine for the EPA Storm Water Management Model (SWMM). Coarray-parallel finite-volume dynamic-wave hydraulics that re-uses the legacy EPA SWMM5 C engine for input parsing and hydrology.",
  children: [
    {
      name: "definitions",
      path: "definitions",
      kind: "dir",
      subsystem: "utility",
      description:
        "Shared enumerations, global constants, derived types, and runtime settings used everywhere in the code.",
      children: [
        { name: "define_api_keys.f90",   path: "definitions/define_api_keys.f90",   kind: "file", subsystem: "interface", description: "Integer keys that match the C-side enum in the EPA SWMM interface so the two engines agree on object/property IDs." },
        { name: "define_globals.f90",    path: "definitions/define_globals.f90",    kind: "file", subsystem: "utility",   description: "Global parameters: gravity, math constants, file-unit numbers, dummy reals, default time values." },
        { name: "define_indexes.f90",    path: "definitions/define_indexes.f90",    kind: "file", subsystem: "utility",   description: "Column indexes into the master element / face / link / node arrays — the canonical 'schema' of the run-time data model." },
        { name: "define_keys.f90",       path: "definitions/define_keys.f90",       kind: "file", subsystem: "utility",   description: "Symbolic enums for element types, geometry shapes, time-march schemes, BC types, etc." },
        { name: "define_settings.f90",   path: "definitions/define_settings.f90",   kind: "file", subsystem: "utility",   description: "The `setting` derived type tree — every user-tunable knob in the JSON settings file maps into here." },
        { name: "define_types.f90",      path: "definitions/define_types.f90",      kind: "file", subsystem: "utility",   description: "Derived Fortran types for transects, controls, profiler frames, partitioning records." },
        { name: "define_xsect_tables.f90", path: "definitions/define_xsect_tables.f90", kind: "file", subsystem: "network", description: "Lookup tables for non-prismatic cross-sections (area/width/perimeter vs. depth) — ported from EPA SWMM xsect.dat." },
      ],
    },
    {
      name: "interface",
      path: "interface",
      kind: "dir",
      subsystem: "interface",
      description:
        "Fortran ⇄ C bridge. The bundled EPA SWMM5 engine is built as a shared library; SWMM5+ calls it for input parsing, hydrology, and a few utilities.",
      children: [
        { name: "Makefile",        path: "interface/Makefile",        kind: "file", subsystem: "interface", description: "Build rules for the libswmm5 shared library and the F2008 interoperability glue." },
        { name: "Makefile_swmm5",  path: "interface/Makefile_swmm5",  kind: "file", subsystem: "interface", description: "Compiles the bundled EPA SWMM5 C sources into libswmm5.so used by the Fortran side." },
        { name: "c_library.f90",   path: "interface/c_library.f90",   kind: "file", subsystem: "interface", description: "ISO_C_BINDING declarations of every C function SWMM5+ reaches into (api_*, swmm_*)." },
        { name: "interface.f90",   path: "interface/interface.f90",   kind: "file", subsystem: "interface", description: "High-level Fortran wrappers around the C API: open project, fetch links/nodes/subcatchments, run hydrology step, close." },
        { name: "Readme.md",       path: "interface/Readme.md",       kind: "file", subsystem: "interface", description: "Notes on the C interface design and how to keep keys in sync between the two languages." },
      ],
    },
    {
      name: "initialization",
      path: "initialization",
      kind: "dir",
      subsystem: "init",
      description:
        "Reads the input via the C engine, partitions the network across coarray images, discretizes links into finite-volume elements, and sets initial conditions.",
      children: [
        { name: "BIPquick.f90",         path: "initialization/BIPquick.f90",         kind: "file", subsystem: "init", description: "Balanced Iterative Partitioning — the graph-partition algorithm that assigns network elements to MPI/coarray images for load balance." },
        { name: "discretization.f90",   path: "initialization/discretization.f90",   kind: "file", subsystem: "init", description: "Splits each conduit/link into N finite-volume elements based on settings.Discretization.NominalElemLength." },
        { name: "ic_lowlevel.f90",      path: "initialization/ic_lowlevel.f90",      kind: "file", subsystem: "init", description: "Per-element/per-face initial-condition helpers (depth, area, flowrate, geometry consistency)." },
        { name: "initial_condition.f90",path: "initialization/initial_condition.f90",kind: "file", subsystem: "init", description: "Drives the IC setup: cold start vs hotstart, fills the element and face arrays before the time loop." },
        { name: "initialization.f90",   path: "initialization/initialization.f90",   kind: "file", subsystem: "init", description: "Top-level initialize() entry point — orchestrates settings load, C-engine open, network read, partition, discretize, IC." },
        { name: "network_define.f90",   path: "initialization/network_define.f90",   kind: "file", subsystem: "init", description: "Builds SWMM5+'s element/face network data structures from the link-node topology returned by the C engine." },
        { name: "pack_mask_arrays.f90", path: "initialization/pack_mask_arrays.f90", kind: "file", subsystem: "init", description: "Builds packed index arrays (e.g. only-CC-elements, only-diagnostic-faces) used to avoid masked loops in the hot path." },
        { name: "partitioning.f90",     path: "initialization/partitioning.f90",     kind: "file", subsystem: "init", description: "Wrapper that selects a partitioning strategy (BIPquick, default, random) and applies it to images." },
      ],
    },
    {
      name: "geometry",
      path: "geometry",
      kind: "dir",
      subsystem: "network",
      description:
        "Cross-section geometry for every supported conduit/channel shape. Each file converts depth ⇄ area ⇄ topwidth ⇄ perimeter for one shape.",
      children: [
        { name: "geometry.f90",                          path: "geometry/geometry.f90",                          kind: "file", subsystem: "network", description: "Top-level dispatcher: looks at element shape and calls the right per-shape routine." },
        { name: "geometry_lowlevel.f90",                 path: "geometry/geometry_lowlevel.f90",                 kind: "file", subsystem: "network", description: "Common helpers (hydraulic radius, sediment-corrected area, slot adjustments) shared by every shape." },
        { name: "circular_conduit.f90",                  path: "geometry/circular_conduit.f90",                  kind: "file", subsystem: "network", description: "Closed circular pipe geometry, with Preissmann-slot extension when surcharged." },
        { name: "filled_circular_conduit.f90",           path: "geometry/filled_circular_conduit.f90",           kind: "file", subsystem: "network", description: "Circular pipe with sediment fill at the invert." },
        { name: "forcemain.f90",                         path: "geometry/forcemain.f90",                         kind: "file", subsystem: "network", description: "Force-main (always-pressurized) conduit treatment." },
        { name: "irregular_channel.f90",                 path: "geometry/irregular_channel.f90",                 kind: "file", subsystem: "network", description: "User-supplied transect channels — depth/area/width interpolation from EPA SWMM TRANSECT data." },
        { name: "mod_basket_conduit.f90",                path: "geometry/mod_basket_conduit.f90",                kind: "file", subsystem: "network", description: "Modified-basket-handle conduit shape." },
        { name: "parabolic_channel.f90",                 path: "geometry/parabolic_channel.f90",                 kind: "file", subsystem: "network", description: "Parabolic open channel." },
        { name: "powerfunction_channel.f90",             path: "geometry/powerfunction_channel.f90",             kind: "file", subsystem: "network", description: "Power-function open channel y = a·xᵇ." },
        { name: "rectangular_channel.f90",               path: "geometry/rectangular_channel.f90",               kind: "file", subsystem: "network", description: "Open rectangular channel." },
        { name: "rectangular_conduit.f90",               path: "geometry/rectangular_conduit.f90",               kind: "file", subsystem: "network", description: "Closed rectangular conduit with slot pressurization." },
        { name: "rectangular_round_conduit.f90",         path: "geometry/rectangular_round_conduit.f90",         kind: "file", subsystem: "network", description: "Rectangular conduit with rounded bottom." },
        { name: "rectangular_triangular_conduit.f90",    path: "geometry/rectangular_triangular_conduit.f90",    kind: "file", subsystem: "network", description: "Rectangular conduit with triangular bottom." },
        { name: "storage_geometry.f90",                  path: "geometry/storage_geometry.f90",                  kind: "file", subsystem: "network", description: "Storage-node depth–area/depth–volume curves." },
        { name: "trapezoidal_channel.f90",               path: "geometry/trapezoidal_channel.f90",               kind: "file", subsystem: "network", description: "Trapezoidal open channel." },
        { name: "triangular_channel.f90",                path: "geometry/triangular_channel.f90",                kind: "file", subsystem: "network", description: "Triangular (V-shape) open channel." },
        { name: "xsect_tables.f90",                      path: "geometry/xsect_tables.f90",                      kind: "file", subsystem: "network", description: "Generic table lookup engine used by closed shapes whose geometry comes from precomputed dimensionless tables." },
      ],
    },
    {
      name: "special_elements",
      path: "special_elements",
      kind: "dir",
      subsystem: "hydraulics",
      description:
        "Non-conduit hydraulic elements that need their own constitutive rating curve: weirs, orifices, pumps, outlets, culverts.",
      children: [
        { name: "common_elements.f90",       path: "special_elements/common_elements.f90",       kind: "file", subsystem: "hydraulics", description: "Shared helpers for all diagnostic/special elements (flowrate clipping, head/depth bookkeeping)." },
        { name: "control_hydraulics.f90",    path: "special_elements/control_hydraulics.f90",    kind: "file", subsystem: "hydraulics", description: "Real-time control (RTC) rule evaluation that re-uses EPA SWMM's controls.c logic." },
        { name: "culvert_elements.f90",      path: "special_elements/culvert_elements.f90",      kind: "file", subsystem: "hydraulics", description: "FHWA-style culvert inlet/outlet control rating." },
        { name: "diagnostic_elements.f90",   path: "special_elements/diagnostic_elements.f90",   kind: "file", subsystem: "hydraulics", description: "Dispatcher for elements whose flow is determined by a rating equation rather than the momentum solver." },
        { name: "jump.f90",                  path: "special_elements/jump.f90",                  kind: "file", subsystem: "hydraulics", description: "Hydraulic-jump detection / handling across element faces." },
        { name: "orifice_elements.f90",      path: "special_elements/orifice_elements.f90",      kind: "file", subsystem: "hydraulics", description: "Orifice rating (side/bottom, circular/rectangular)." },
        { name: "outlet_elements.f90",       path: "special_elements/outlet_elements.f90",       kind: "file", subsystem: "hydraulics", description: "User-defined outlet rating curves." },
        { name: "pump_elements.f90",         path: "special_elements/pump_elements.f90",         kind: "file", subsystem: "hydraulics", description: "Pump curves (types 1–4) and on/off depth triggers." },
        { name: "roadway_weir_elements.f90", path: "special_elements/roadway_weir_elements.f90", kind: "file", subsystem: "hydraulics", description: "FHWA roadway overtopping weir." },
        { name: "weir_elements.f90",         path: "special_elements/weir_elements.f90",         kind: "file", subsystem: "hydraulics", description: "Transverse / side-flow / V-notch / trapezoidal weir ratings." },
      ],
    },
    {
      name: "timeloop",
      path: "timeloop",
      kind: "dir",
      subsystem: "timeloop",
      description:
        "The hot path: Runge–Kutta 2 finite-volume time march, face/element flux updates, Preissmann slot, junctions, boundary conditions.",
      children: [
        { name: "timeloop.f90",          path: "timeloop/timeloop.f90",          kind: "file", subsystem: "timeloop", description: "Outer hydraulics/hydrology time loop: adaptive dt, coupling, monitoring, sub-step orchestration." },
        { name: "runge_kutta2.f90",      path: "timeloop/runge_kutta2.f90",      kind: "file", subsystem: "hydraulics", description: "RK2 stage controller — calls face → element → junction → diagnostic updates in the right order." },
        { name: "rk2_lowlevel.f90",      path: "timeloop/rk2_lowlevel.f90",      kind: "file", subsystem: "hydraulics", description: "RK2 sub-step kernels: continuity and momentum updates per element." },
        { name: "face.f90",              path: "timeloop/face.f90",              kind: "file", subsystem: "hydraulics", description: "Face-centered flux reconstruction between elements; the finite-volume crux." },
        { name: "update.f90",            path: "timeloop/update.f90",            kind: "file", subsystem: "hydraulics", description: "Post-stage element update: derived quantities (head, velocity, Froude) from conserved variables." },
        { name: "adjust.f90",            path: "timeloop/adjust.f90",            kind: "file", subsystem: "hydraulics", description: "Limiting / clipping (small depths, near-zero flows, smoothing) to keep the scheme stable." },
        { name: "preissmann_slot.f90",   path: "timeloop/preissmann_slot.f90",   kind: "file", subsystem: "hydraulics", description: "Preissmann-slot pressurization: lets the free-surface solver represent surcharged closed conduits." },
        { name: "junction_elements.f90", path: "timeloop/junction_elements.f90", kind: "file", subsystem: "hydraulics", description: "Volume-conserving junction update connecting multiple incident conduits at a node." },
        { name: "junction_lowlevel.f90", path: "timeloop/junction_lowlevel.f90", kind: "file", subsystem: "hydraulics", description: "Per-junction kernels (head/volume balance, overflow ponding)." },
        { name: "boundary_conditions.f90",path:"timeloop/boundary_conditions.f90",kind: "file", subsystem: "hydraulics", description: "External inflows, head/tide outfalls — interpolates EPA SWMM time series and applies them at faces." },
        { name: "air_entrapment.f90",    path: "timeloop/air_entrapment.f90",    kind: "file", subsystem: "hydraulics", description: "Trapped-air pocket model for surcharged tunnels — a key SWMM5+ research contribution." },
      ],
    },
    {
      name: "main",
      path: "main",
      kind: "dir",
      subsystem: "output",
      description: "Program entry point, finalization, and output writers.",
      children: [
        { name: "main.f90",        path: "main/main.f90",        kind: "file", subsystem: "init",   description: "PROGRAM SWMM — calls initialize → timeloop → finalize. Top of the call tree." },
        { name: "finalization.f90",path: "main/finalization.f90",kind: "file", subsystem: "output", description: "Closes the C engine, flushes HDF5 / CSV, combines per-image output files, prints summary." },
        { name: "output.f90",      path: "main/output.f90",      kind: "file", subsystem: "output", description: "Element/face/link/node result writers, HDF5 layout, CSV reports." },
      ],
    },
    {
      name: "utility",
      path: "utility",
      kind: "dir",
      subsystem: "utility",
      description: "Cross-cutting helpers: allocation, profiling, datetime, file I/O, debugging, unit tests.",
      children: [
        { name: "utility.f90",               path: "utility/utility.f90",               kind: "file", subsystem: "utility", description: "Misc helpers used everywhere (sign, clipping, safe division, image-aware sync)." },
        { name: "utility_allocate.f90",      path: "utility/utility_allocate.f90",      kind: "file", subsystem: "utility", description: "Allocates the big element / face / link / node coarrays once the partition is known." },
        { name: "utility_deallocate.f90",    path: "utility/utility_deallocate.f90",    kind: "file", subsystem: "utility", description: "Mirror deallocation at finalize." },
        { name: "utility_array.f90",         path: "utility/utility_array.f90",         kind: "file", subsystem: "utility", description: "Array helpers (sort, unique, search, pack)." },
        { name: "utility_crash.f90",         path: "utility/utility_crash.f90",         kind: "file", subsystem: "utility", description: "Centralized error-stop with image-aware diagnostic printout." },
        { name: "utility_datetime.f90",      path: "utility/utility_datetime.f90",      kind: "file", subsystem: "utility", description: "Datetime arithmetic that mirrors EPA SWMM's datetime.c." },
        { name: "utility_debug.f90",         path: "utility/utility_debug.f90",         kind: "file", subsystem: "utility", description: "Conditional debug printouts gated by setting flags." },
        { name: "utility_files.f90",         path: "utility/utility_files.f90",         kind: "file", subsystem: "utility", description: "Filename/path handling, output-directory creation." },
        { name: "utility_interpolate.f90",   path: "utility/utility_interpolate.f90",   kind: "file", subsystem: "utility", description: "1-D table interpolation used by transects, rating curves, time series." },
        { name: "utility_key_default.f90",   path: "utility/utility_key_default.f90",   kind: "file", subsystem: "utility", description: "Default key/enum values applied before settings JSON is read." },
        { name: "utility_output.f90",        path: "utility/utility_output.f90",        kind: "file", subsystem: "output",  description: "Low-level HDF5/CSV writers used by main/output.f90." },
        { name: "utility_profiler.f90",      path: "utility/utility_profiler.f90",      kind: "file", subsystem: "utility", description: "Lightweight section timing with start/stop frames." },
        { name: "utility_string.f90",        path: "utility/utility_string.f90",        kind: "file", subsystem: "utility", description: "String helpers (upper, trim-all, split) needed because Fortran has so few." },
        { name: "utility_unit_testing.f90",  path: "utility/utility_unit_testing.f90",  kind: "file", subsystem: "utility", description: "Inline assertions used by the ctest suite." },
      ],
    },
    {
      name: "ctest",
      path: "ctest",
      kind: "dir",
      description: "CTest-driven regression tests (levels 01–03 plus release tests). Not part of the runtime engine.",
      children: [
        { name: "CMakeLists.txt", path: "ctest/CMakeLists.txt", kind: "file", description: "Registers the test layers with CTest." },
        { name: "internal_testing/level01_test",  path: "ctest/internal_testing/level01_test",  kind: "dir", description: "Smallest unit-style tests." },
        { name: "internal_testing/level02_test",  path: "ctest/internal_testing/level02_test",  kind: "dir", description: "Mid-size feature tests." },
        { name: "internal_testing/level03_test",  path: "ctest/internal_testing/level03_test",  kind: "dir", description: "End-to-end scenario tests." },
        { name: "internal_testing/release_tests", path: "ctest/internal_testing/release_tests", kind: "dir", description: "Tests gated on a release build." },
      ],
    },
    {
      name: "test_cases",
      path: "test_cases",
      kind: "dir",
      description: "Curated, committed test cases — inputs and expected outputs.",
      children: [],
    },
    {
      name: "test_notSync",
      path: "test_notSync",
      kind: "dir",
      description: "Larger / scratch test cases not synced into the regression suite (calumet, extran1, parallel, orifice, weir, pump, storage, air-trapping, etc.).",
      children: [],
    },
    { name: "CMakeLists.txt", path: "CMakeLists.txt", kind: "file", description: "Top-level CMake build (Fortran + bundled C SWMM5)." },
    { name: "Readme.md",      path: "Readme.md",      kind: "file", description: "Project readme: prerequisites, build, run." },
  ],
};
