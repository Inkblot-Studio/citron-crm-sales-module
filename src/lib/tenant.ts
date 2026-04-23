/**
 * White-label / multi-tenant id from env (HillCode inject copies tenants/<id>/ to .env.local).
 * Use in theme wrappers or for subtle UI distinction per tenant.
 */
export const TENANT_ID: string = import.meta.env.VITE_TENANT ?? 'default'

export const isDefaultTenant: boolean = TENANT_ID === 'default'
