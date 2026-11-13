# MIDAS Belize: Interactive Decision Support for Integrated Ecosystem-Service Models

**MIDAS** (Marine Integrated Decision Analysis System) is a web-based decision-support platform for exploring and communicating outputs of the **Multiscale Integrated Model of Ecosystem Services (MIMES)** across reef, coastal, and watershed domains in Belize.

* **Live deployment:** [https://midas-belize-prod.web.app](https://midas-belize-prod.web.app)
* **License:** [MIT](./LICENSE)

---

## Overview

Integrated ecosystem-service simulations vary across management scenarios, time steps, species/guilds, depth/elevation bins, and spatial polygons. MIDAS bridges simulation production and stakeholder interpretation through:

1. **Automated, Provenance-Gated Publication (`scripts/pre-process/`, `functions/`):** Converts upstream Simile, GIS, and tabular outputs into content-addressed, versioned web datasets (`GeoJSON`, `COG`, and `JSON`), requiring source, license, and citation metadata before publication.
2. **Coordinated Multi-Domain Exploration (`src/`):** Connects marine (coral restoration, food-web guilds, clade composition), coastal (wave attenuation, vulnerability, resolution comparison), watershed (RUSLE soil-loss screening, sediment fate, NbS prioritization), and scenario workflows on a shared deck.gl + MapLibre GL JS platform.
3. **Explicit Assumptions & Customizable Priority Weights:** Exposes formulas, factor values, units, and data sources alongside outputs, and provides interactive priority-weight sliders for ranking watershed Nature-based Solutions (NbS).

---

## Repository Structure

| Path | Description |
|------|-------------|
| `src/` | Next.js 16 + React 19 + TypeScript web client, domain modules (`marine`, `watershed`, `coastal`, `scenarios`), Jotai state, and data API routes |
| `scripts/pre-process/` | Automated data publication pipeline, converter registry, RUSLE pre-processing scripts, schema definitions, and `.provenance.json` dataset sidecars |
| `scripts/simile/` | Headless R runners and analysis scripts for executing Simile MIMES coral and ecosystem-service scenario matrices |
| `functions/` | Firebase Cloud Functions for Google Drive change polling, mirroring, and pipeline alerting |
| `tests/` | Unit (`vitest`), integration, and end-to-end (`playwright`) test suites |
| `evaluation/` | Production delivery benchmark scripts (`pageperf.mjs`, `pageperf_slow4g.mjs`) and catalog/operations evaluation snapshots |
| `public/` | Fonts, static assets, and sample geospatial fixtures |

---

## Getting Started (Local Development)

### Prerequisites
* **Node.js** `>= 22` and **pnpm** `>= 10`
* **Firebase CLI** (`firebase-tools`) for local Firestore and Cloud Storage emulators
* *(Optional, for model regeneration and raster pre-processing)* **R**, **Simile v7.4**, and **Python 3** with `GDAL` / `rio-cogeo`

### Installation & Local Server
```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

### Running Tests
```bash
# Unit tests
pnpm test

# Integration tests (with Firebase emulators)
pnpm test:integration

# End-to-end Playwright tests
pnpm test:e2e
```

---

## Citation

If you use MIDAS Belize or its publication pipeline in your research, please cite:

> Pitts, J., Gopal, S., Boumans, R., & Kaufman, L. (2026). *From simulation to stakeholder: MIDAS for communicating integrated ecosystem-service models in Belize*.

## Funding & Acknowledgments

Supported by U.S. National Science Foundation award **2209284** (*Large-scale CoPe: Strong Coasts: Developing Solutions with Nature and People*).
