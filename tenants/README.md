# Tenants (HillCode)

Each subdirectory is a **white-label / env profile**. HillCode’s inject step copies, in order of preference:

1. `tenants/<id>/.env.local`
2. `tenants/<id>/env`
3. `tenants/<id>/.env`
4. or generates a minimal `.env.local` with `VITE_TENANT=<id>` only

The result is always written to the **repository root** as `.env.local` (gitignored).  
You can add `VITE_SUPABASE_URL`, `VITE_TENANT`, theme-related variables, etc.

## New tenant

1. `mkdir -p tenants/<id> && cp tenants/default/env tenants/<id>/env` and edit.
2. Optional: add the tenant to internal docs; the TUI auto-discovers all folders here.
3. `bash scripts/inject_tenant_config.sh <id>` or `npm run hillcode` and pick the tenant.
