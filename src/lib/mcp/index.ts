import { defineMcp } from "@lovable.dev/mcp-js";
import listModules from "./tools/list-modules";
import getModule from "./tools/get-module";
import searchModules from "./tools/search-modules";
import listPapers from "./tools/list-papers";
import fetchModuleSource from "./tools/fetch-module-source";
import getPaper from "./tools/get-paper";
import downloadModuleBundle from "./tools/download-module-bundle";

export default defineMcp({
  name: "swmm5plus-repo-explorer",
  title: "SWMM5+ Repo Explorer",
  version: "0.2.0",
  instructions:
    "Tools for exploring the CIMM-ORG SWMM5+ Fortran codebase: list and search modules, get module dependencies, fetch raw Fortran source from GitHub, download a zipped bundle of a module plus its transitive `use` closure, browse the curated Hodges research paper list, and fetch full metadata for a single paper.",
  tools: [
    listModules,
    getModule,
    searchModules,
    listPapers,
    getPaper,
    fetchModuleSource,
    downloadModuleBundle,
  ],
});
