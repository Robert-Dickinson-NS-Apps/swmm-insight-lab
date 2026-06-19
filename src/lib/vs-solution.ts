import JSZip from "jszip";
import type { AutoModule } from "@/data/auto-modules";
import { EXTRACTED_AT, GITHUB_BRANCH, GITHUB_REPO } from "@/data/auto-modules";
import { generateCSkeleton } from "@/lib/c-skeleton";

/**
 * Build a Visual Studio solution zip containing:
 *   - one <module>.h / <module>.c pair per selected Fortran module
 *   - a main.c entry point that calls every module's init/step/finalize
 *   - swmm5plus.vcxproj / .vcxproj.filters
 *   - swmm5plus.sln
 *   - CMakeLists.txt as a cross-platform alternative
 *   - README.md with build instructions
 *
 * The output compiles cleanly with MSVC (Visual Studio 2022, v143 toolset)
 * out of the box because every generated .c only references symbols from
 * other generated headers — bodies are TODO stubs. This means the user can
 * open the .sln, hit Build, and get a working executable to start porting
 * subroutines into.
 */

// Stable GUIDs — required by the .sln/.vcxproj format. These don't need to
// be unique per export; Visual Studio identifies projects by GUID within a
// solution and these values are valid GUIDs that won't collide with anything.
const SOLUTION_GUID = "{8BC9CEB8-8B4A-11D0-8D11-00A0C91BC942}"; // VC++ project type
const PROJECT_GUID = "{B1234567-89AB-4CDE-9012-3456789ABCDE}";

function mainC(modules: AutoModule[]): string {
  const includes = modules.map((m) => `#include "${m.id}.h"`).join("\n");
  const inits = modules.map((m) => `    ${m.id}__init();`).join("\n");
  const steps = modules.map((m) => `        ${m.id}__step(dt);`).join("\n");
  const fins = [...modules]
    .reverse()
    .map((m) => `    ${m.id}__finalize();`)
    .join("\n");

  return `/*
 * main.c - Auto-generated entry point for SWMM5+ C translation.
 *
 * Generated from ${GITHUB_REPO}@${GITHUB_BRANCH} on ${EXTRACTED_AT}.
 * Modules included: ${modules.length}
 *
 * This file calls every translated module's init / step / finalize stub
 * in declaration order. Replace the toy time loop below with the real
 * SWMM5+ driver as you port the timeloop module.
 */
#include <stdio.h>

${includes}

int main(int argc, char** argv) {
    (void)argc; (void)argv;
    printf("SWMM5+ (C translation) starting...\\n");

    /* --- initialization phase --- */
${inits}

    /* --- toy time loop (replace with real driver) --- */
    const double dt = 1.0;
    for (int t = 0; t < 1; ++t) {
${steps}
    }

    /* --- finalization (reverse order) --- */
${fins}

    printf("SWMM5+ (C translation) done.\\n");
    return 0;
}
`;
}

function vcxproj(modules: AutoModule[]): string {
  const clCompile = [
    `    <ClCompile Include="src\\main.c" />`,
    ...modules.map((m) => `    <ClCompile Include="src\\${m.id}.c" />`),
  ].join("\n");
  const clInclude = modules
    .map((m) => `    <ClInclude Include="src\\${m.id}.h" />`)
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup Label="ProjectConfigurations">
    <ProjectConfiguration Include="Debug|x64">
      <Configuration>Debug</Configuration>
      <Platform>x64</Platform>
    </ProjectConfiguration>
    <ProjectConfiguration Include="Release|x64">
      <Configuration>Release</Configuration>
      <Platform>x64</Platform>
    </ProjectConfiguration>
  </ItemGroup>
  <PropertyGroup Label="Globals">
    <VCProjectVersion>17.0</VCProjectVersion>
    <ProjectGuid>${PROJECT_GUID}</ProjectGuid>
    <RootNamespace>swmm5plus</RootNamespace>
    <WindowsTargetPlatformVersion>10.0</WindowsTargetPlatformVersion>
  </PropertyGroup>
  <Import Project="$(VCTargetsPath)\\Microsoft.Cpp.Default.props" />
  <PropertyGroup Condition="'$(Configuration)|$(Platform)'=='Debug|x64'" Label="Configuration">
    <ConfigurationType>Application</ConfigurationType>
    <UseDebugLibraries>true</UseDebugLibraries>
    <PlatformToolset>v143</PlatformToolset>
    <CharacterSet>Unicode</CharacterSet>
  </PropertyGroup>
  <PropertyGroup Condition="'$(Configuration)|$(Platform)'=='Release|x64'" Label="Configuration">
    <ConfigurationType>Application</ConfigurationType>
    <UseDebugLibraries>false</UseDebugLibraries>
    <PlatformToolset>v143</PlatformToolset>
    <WholeProgramOptimization>true</WholeProgramOptimization>
    <CharacterSet>Unicode</CharacterSet>
  </PropertyGroup>
  <Import Project="$(VCTargetsPath)\\Microsoft.Cpp.props" />
  <ItemDefinitionGroup Condition="'$(Configuration)|$(Platform)'=='Debug|x64'">
    <ClCompile>
      <WarningLevel>Level3</WarningLevel>
      <SDLCheck>true</SDLCheck>
      <PreprocessorDefinitions>_DEBUG;_CONSOLE;%(PreprocessorDefinitions)</PreprocessorDefinitions>
      <ConformanceMode>true</ConformanceMode>
      <AdditionalIncludeDirectories>$(ProjectDir)src;%(AdditionalIncludeDirectories)</AdditionalIncludeDirectories>
      <LanguageStandard_C>stdc17</LanguageStandard_C>
      <CompileAs>CompileAsC</CompileAs>
    </ClCompile>
    <Link>
      <SubSystem>Console</SubSystem>
      <GenerateDebugInformation>true</GenerateDebugInformation>
    </Link>
  </ItemDefinitionGroup>
  <ItemDefinitionGroup Condition="'$(Configuration)|$(Platform)'=='Release|x64'">
    <ClCompile>
      <WarningLevel>Level3</WarningLevel>
      <FunctionLevelLinking>true</FunctionLevelLinking>
      <IntrinsicFunctions>true</IntrinsicFunctions>
      <SDLCheck>true</SDLCheck>
      <PreprocessorDefinitions>NDEBUG;_CONSOLE;%(PreprocessorDefinitions)</PreprocessorDefinitions>
      <ConformanceMode>true</ConformanceMode>
      <AdditionalIncludeDirectories>$(ProjectDir)src;%(AdditionalIncludeDirectories)</AdditionalIncludeDirectories>
      <LanguageStandard_C>stdc17</LanguageStandard_C>
      <CompileAs>CompileAsC</CompileAs>
    </ClCompile>
    <Link>
      <SubSystem>Console</SubSystem>
      <EnableCOMDATFolding>true</EnableCOMDATFolding>
      <OptimizeReferences>true</OptimizeReferences>
      <GenerateDebugInformation>true</GenerateDebugInformation>
    </Link>
  </ItemDefinitionGroup>
  <ItemGroup>
${clCompile}
  </ItemGroup>
  <ItemGroup>
${clInclude}
  </ItemGroup>
  <Import Project="$(VCTargetsPath)\\Microsoft.Cpp.targets" />
</Project>
`;
}

function vcxprojFilters(modules: AutoModule[]): string {
  const sources = [
    `    <ClCompile Include="src\\main.c"><Filter>Source Files</Filter></ClCompile>`,
    ...modules.map(
      (m) =>
        `    <ClCompile Include="src\\${m.id}.c"><Filter>Source Files</Filter></ClCompile>`,
    ),
  ].join("\n");
  const headers = modules
    .map(
      (m) =>
        `    <ClInclude Include="src\\${m.id}.h"><Filter>Header Files</Filter></ClInclude>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<Project ToolsVersion="4.0" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup>
    <Filter Include="Source Files">
      <UniqueIdentifier>{4FC737F1-C7A5-4376-A066-2A32D752A2FF}</UniqueIdentifier>
      <Extensions>c;cpp</Extensions>
    </Filter>
    <Filter Include="Header Files">
      <UniqueIdentifier>{93995380-89BD-4b04-88EB-625FBE52EBFB}</UniqueIdentifier>
      <Extensions>h;hpp</Extensions>
    </Filter>
  </ItemGroup>
  <ItemGroup>
${sources}
  </ItemGroup>
  <ItemGroup>
${headers}
  </ItemGroup>
</Project>
`;
}

function sln(): string {
  return `Microsoft Visual Studio Solution File, Format Version 12.00
# Visual Studio Version 17
VisualStudioVersion = 17.0.0.0
MinimumVisualStudioVersion = 10.0.40219.1
Project("${SOLUTION_GUID}") = "swmm5plus", "swmm5plus.vcxproj", "${PROJECT_GUID}"
EndProject
Global
\tGlobalSection(SolutionConfigurationPlatforms) = preSolution
\t\tDebug|x64 = Debug|x64
\t\tRelease|x64 = Release|x64
\tEndGlobalSection
\tGlobalSection(ProjectConfigurationPlatforms) = postSolution
\t\t${PROJECT_GUID}.Debug|x64.ActiveCfg = Debug|x64
\t\t${PROJECT_GUID}.Debug|x64.Build.0 = Debug|x64
\t\t${PROJECT_GUID}.Release|x64.ActiveCfg = Release|x64
\t\t${PROJECT_GUID}.Release|x64.Build.0 = Release|x64
\tEndGlobalSection
\tGlobalSection(SolutionProperties) = preSolution
\t\tHideSolutionNode = FALSE
\tEndGlobalSection
EndGlobal
`;
}

function cmakeLists(modules: AutoModule[]): string {
  const sources = ["src/main.c", ...modules.map((m) => `src/${m.id}.c`)]
    .map((p) => `    ${p}`)
    .join("\n");
  return `cmake_minimum_required(VERSION 3.20)
project(swmm5plus C)

set(CMAKE_C_STANDARD 17)
set(CMAKE_C_STANDARD_REQUIRED ON)

add_executable(swmm5plus
${sources}
)

target_include_directories(swmm5plus PRIVATE src)

if (MSVC)
    target_compile_options(swmm5plus PRIVATE /W3 /permissive-)
else()
    target_compile_options(swmm5plus PRIVATE -Wall -Wextra -Wno-unused-parameter)
endif()
`;
}

function readme(modules: AutoModule[]): string {
  return `# SWMM5+ — Auto-generated C translation

Generated on ${new Date().toISOString()} from
\`${GITHUB_REPO}\` @ \`${GITHUB_BRANCH}\` (extracted ${EXTRACTED_AT}).

Includes ${modules.length} module(s) translated as compilable C stubs.

## Building with Visual Studio 2022

1. Double-click \`swmm5plus.sln\`.
2. Pick the **x64** \`Debug\` or \`Release\` configuration.
3. **Build > Build Solution** (Ctrl+Shift+B).
4. Run with F5. You should see:

   \`\`\`
   SWMM5+ (C translation) starting...
   SWMM5+ (C translation) done.
   \`\`\`

The MSVC toolset is **v143** and the C standard is **C17**. Include
directories are set to \`$(ProjectDir)src\`.

## Building with CMake (cross-platform)

\`\`\`bash
cmake -S . -B build
cmake --build build --config Release
./build/swmm5plus           # or build\\Release\\swmm5plus.exe on Windows
\`\`\`

## What's in here

\`\`\`
swmm5plus.sln               Visual Studio solution
swmm5plus.vcxproj           MSBuild project
swmm5plus.vcxproj.filters   Solution Explorer filters
CMakeLists.txt              CMake alternative
src/main.c                  Entry point — calls every module's init/step/finalize
src/<module>.h              One header per Fortran module
src/<module>.c              One source per Fortran module (TODO bodies)
README.txt                  Plain-text version of these instructions
\`\`\`

## Porting workflow

1. Open the module's \`.c\` file.
2. Compare against the original Fortran source — the header comment at
   the top of each generated file links back to the exact \`.f90\` path and
   line.
3. Replace the \`TODO\` bodies of \`<module>__init\`, \`<module>__step\`,
   and \`<module>__finalize\` with translated logic.
4. Add additional functions as needed; declare them in the header so
   other modules can call them via \`#include\`.

The \`#include\` directives in each header mirror the original Fortran
\`use\` graph, so dependency order is already correct.
`;
}

function readmeTxt(modules: AutoModule[]): string {
  return `SWMM5+ — Auto-generated C translation
================================================================================
Generated on ${new Date().toISOString()} from ${GITHUB_REPO} @ ${GITHUB_BRANCH}
(extracted ${EXTRACTED_AT}).
Includes ${modules.length} module(s) translated as compilable C stubs.

QUICK START — VISUAL STUDIO 2022
================================================================================
1. Unzip swmm5plus_c.zip to a folder on your local machine.
2. Double-click swmm5plus.sln to open the solution in Visual Studio 2022.
3. In the toolbar, make sure the platform is set to x64 (not Any CPU or Win32).
4. Choose a configuration:
      Debug   = full symbols, no optimization, fastest build
      Release = optimized build
5. Build > Build Solution (or press Ctrl+Shift+B).
   The first build should complete with no errors and only the expected
   "TODO" warning-level unused-parameter warnings. If you see linker errors,
   make sure the include path below is correct.
6. Run the program by pressing F5 or by choosing Debug > Start Debugging.
   You should see the console output:

      SWMM5+ (C translation) starting...
      SWMM5+ (C translation) done.

REQUIRED COMPILER SETTINGS
================================================================================
Toolset          : Visual Studio 2022 (v143)
Platform         : x64
C language       : C17 (ISO/IEC 9899:2018)
Character set    : Unicode
Configuration    : Debug or Release
Warning level    : Level3 (/W3)
SDL checks       : enabled (/sdl)
Conformance mode : Yes (/permissive-)
Include path     : $(ProjectDir)src

These settings are already written in swmm5plus.vcxproj. You do not need to
change them unless you are adding third-party libraries or moving the src/
folder.

HOW TO RUN THE GENERATED MAIN PROGRAM
================================================================================
From Visual Studio
------------------
   Make sure the project "swmm5plus" is the StartUp project (it is by default),
   then press F5. The console window will open and show the program output.

From the command line (Windows)
-------------------------------
After building, the executable is located at:

   x64\\Debug\\swmm5plus.exe        (for Debug)
   x64\\Release\\swmm5plus.exe      (for Release)

Open a Developer Command Prompt for VS 2022, cd to the solution folder, and
run:

   x64\\Release\\swmm5plus.exe

or

   x64\\Debug\\swmm5plus.exe

From CMake (cross-platform)
---------------------------
If you prefer CMake, run:

   cmake -S . -B build
   cmake --build build --config Release

The executable will be in:

   build\\swmm5plus      (Linux/macOS)
   build\\Release\\swmm5plus.exe   (Windows)

WHAT EACH FILE DOES
================================================================================
swmm5plus.sln               Visual Studio solution
swmm5plus.vcxproj           MSBuild project with compiler settings above
swmm5plus.vcxproj.filters   Solution Explorer source/header filters
CMakeLists.txt              CMake alternative build file
src/main.c                  Entry point: calls every module's init/step/finalize
src/<module>.h              One header per Fortran module (mirror of use graph)
src/<module>.c              One source per Fortran module (TODO bodies)
README.txt                  This file
README.md                   Markdown version of this file

PORTING NOTES
================================================================================
The generated .c files are intentionally empty stubs that compile and link
cleanly so you have a starting point. To translate a module:

1. Open src/<module>.c.
2. Compare with the original Fortran source — the comment at the top of each
   generated file links to the exact .f90 path and line.
3. Replace the TODO bodies of <module>__init, <module>__step, and
   <module>__finalize with the real C translation.
4. Add more functions as needed and declare them in the matching .h file so
   other modules can call them via #include.

The #include directives in each .h file mirror the original Fortran use graph,
so the dependency order is already correct.
`;
}

export interface BuildOptions {
  /** Modules to include in the generated solution */
  modules: AutoModule[];
  /** Output file name (default: swmm5plus_c.zip) */
  filename?: string;
}

export async function buildVisualStudioSolutionZip(
  opts: BuildOptions,
): Promise<{ blob: Blob; filename: string }> {
  const { modules, filename = "swmm5plus_c.zip" } = opts;
  const zip = new JSZip();

  // top-level project files
  zip.file("swmm5plus.sln", sln());
  zip.file("swmm5plus.vcxproj", vcxproj(modules));
  zip.file("swmm5plus.vcxproj.filters", vcxprojFilters(modules));
  zip.file("CMakeLists.txt", cmakeLists(modules));
  zip.file("README.md", readme(modules));

  // src/ — main.c + per-module pair
  const src = zip.folder("src")!;
  src.file("main.c", mainC(modules));
  for (const m of modules) {
    const s = generateCSkeleton(m);
    src.file(s.header.name, s.header.content);
    src.file(s.source.name, s.source.content);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, filename };
}
