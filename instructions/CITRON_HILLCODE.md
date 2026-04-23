# HillCode (Citron — Vite + Module Federation)

This repository implements the **HillCode** dev TUI/CLI from `guides/HILLCODE_UNIVERSAL_GUIDE.md`, adapted for a **Vite + React** remote (`remoteEntry.js`) instead of Flutter.

| Universal guide (concept)    | This repo (implementation)                          |
| -----------------------------| ---------------------------------------------------- |
| `1 run`                      | `1 dev` – `npm run dev` (Vite)                       |
| `2 web`                      | `2 build` – `tsc` + `vite build` (Federation output) |
| `3 android` / `4 ios`        | `3 preview` (port 5001), `4 deploy` (`vercel --prod`) |
| `inject_client_config.sh`    | `scripts/inject_tenant_config.sh` (tenant `env` → `.env.local`) |
| `CLIENT` dart-define         | `VITE_TENANT` in env (and any other `VITE_*` per tenant) |
| `.flutter_client`            | `.hillcode-tenant` (one-line current tenant id)     |

## Quick start

```bash
npm install
npm run hillcode
```

Headless / CI:

```bash
npm run hillcode -- -c default --cmd dev
npm run hillcode -- -c default --cmd build
npm run hillcode -- -c default --cmd preview
npm run hillcode -- -c default --cmd deploy
```

Same behavior without Node TUI, from the repo root:

```bash
chmod +x build scripts/inject_tenant_config.sh
./build dev default
./build build default
```

## Tenants (white-label)

- Add a directory under `tenants/<id>/` with a committed `env` or `.env.local` (see `tenants/default/env`).
- Run inject (automatic via hillcode) or: `bash scripts/inject_tenant_config.sh <id>`.
- The app reads `import.meta.env.VITE_TENANT` via `src/lib/tenant.ts`. Add more `VITE_*` keys per tenant for APIs, feature flags, or theme token overrides in CSS variables.

## Source layout

- `devtools/hillcode/src/main.ts` – TUI + CLI (`tsx`)
- `build` – Bash wrapper: inject + `npm` for each platform
- `scripts/inject_tenant_config.sh` – copy tenant env to root

For the original Flutter-oriented checklist and extensions, see `guides/HILLCODE_UNIVERSAL_GUIDE.md`.
