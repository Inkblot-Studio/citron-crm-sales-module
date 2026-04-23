# Citron — Sales module (remote)

Vite + Module Federation remote for the CRM host. Exposes `sales/Sales` (`SalesWithProvider`).

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run preview` — serve `dist` (Federation) on port 5001

## Host remotes

After deploy, set the Vite host `remotes` to:

`https://citron-crm-sales-module.vercel.app/assets/remoteEntry.js`

Local preview: `http://localhost:5001/assets/remoteEntry.js`

```ts
const Sales = lazy(() => import('sales/Sales'))
```

## Stack

- `@citron-systems/citron-ds` (design tokens / CSS)
- `@citron-systems/citron-ui` (components)

All UI strings are in English.
