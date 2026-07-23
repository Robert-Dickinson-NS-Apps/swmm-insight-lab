# SWMM Insight Lab

Water, atmosphere, and power modeling for a Valles Marineris settlement.

## About

SWMM Insight Lab is an interactive, single-file web app that models the core utility systems of a hypothetical settlement in Mars's Valles Marineris canyon. It pairs that speculative setting with working EPANET and SWMM5 simulation engines running in the browser, so water distribution and drainage behavior can be explored using the same modeling engines relied on for real-world infrastructure.

## What's Inside

The app models three interdependent settlement systems: water, atmosphere, and power. Water and drainage networks are simulated with EPANET and SWMM5, giving the settlement realistic pressure-driven distribution and conveyance behavior instead of a purely decorative diagram. Models can be exported to the standard .inp format for use in other hydraulic modeling tools, making the app a bridge between speculative habitat design and established water-infrastructure engineering.

## Tech Stack

Built with TypeScript, Vite, and Bun, using a Lovable-managed project structure.

## Getting Started

Clone the repository and install dependencies with Bun.

git clone https://github.com/Robert-Dickinson-NS-Apps/swmm-insight-lab.git
cd swmm-insight-lab
bun install
bun run dev

## License

Released under the MIT License.
