# Citron — Client Intake System

Plug-and-play intake for freelance / agency project requirements.

**Stack:** Tally (public form) → Supabase Edge Function (normalize + tag + AI summary) → Supabase Postgres → Citron Sales module's **Intake** tab.

Designed so that:

- Every field is **optional** — a client can submit nothing but an email and it still lands in the DB.
- The full raw Tally payload is always saved in `raw_payload` (jsonb). You never lose data if the form changes.
- The Edge Function never fails on missing optional services (AI summary, HMAC) — it degrades gracefully.
- The Intake tab inside the Sales module is pure Citron DS/UI, consistent with the rest of the CRM.

Estimated setup time: **~45 minutes end-to-end.**

---

## 1 — Create a new Supabase project (5 min)

1. https://supabase.com/dashboard → **New project**.
2. Copy the following from **Project Settings → API**:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` public key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` secret key (keep it server-side only!).

## 2 — Apply the schema (2 min)

Open **SQL Editor** in the Supabase dashboard and run the contents of
`supabase/migrations/0001_project_intakes.sql`. That creates:

- `project_intakes` table (all content columns nullable, `raw_payload jsonb` safety net)
- `intake_status`, `intake_budget_band`, `intake_timeline` enums
- Indexes on `created_at`, `status`, `tags` (GIN), `contact_email`
- `set_updated_at()` trigger
- RLS policies — **authenticated** users can `select` / `update`; migration `0002_intake_anon_rls_embedded_module.sql` adds **anon** `select` / `update` so this Vite module works with `VITE_SUPABASE_ANON_KEY` without Supabase Auth (tighten for production). **Only service_role can insert** (Edge Function / Tally webhook).
- `project_intakes_summary` convenience view

Or via CLI:

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

## 3 — Deploy the Edge Function (10 min)

From the repo root:

```bash
# 3.1 — login once
supabase login

# 3.2 — link to your new project
supabase link --project-ref YOUR_REF

# 3.3 — set secrets (service_role key is injected automatically)
supabase secrets set TALLY_SIGNING_SECRET=whsec_xxx
supabase secrets set OPENAI_API_KEY=sk-xxx   # optional — omit to skip AI summaries
# supabase secrets set OPENAI_MODEL=gpt-4o-mini    # optional

# 3.4 — deploy
supabase functions deploy intake-webhook --no-verify-jwt
```

`--no-verify-jwt` is required because Tally will POST without a Supabase JWT; the function authenticates incoming requests via `TALLY_SIGNING_SECRET` instead.

The public URL becomes:

```
https://YOUR_REF.supabase.co/functions/v1/intake-webhook
```

### What the function does on every submission

1. Verifies Tally's `tally-signature` header (HMAC-SHA256) if `TALLY_SIGNING_SECRET` is set.
2. Flattens `data.fields[]` into a `{ ref → value }` map (falls back to field label).
3. Normalizes into typed columns — never throws on missing/empty values.
4. Extracts file-upload URLs into `asset_urls`.
5. Computes rule-based tags — see [Tagging rules](#tagging-rules).
6. Calls OpenAI for a 3–5-bullet, ≤90-word summary (skipped silently if no API key).
7. `upsert` on `external_submission_id` — resubmissions from the same response update the same row instead of duplicating.

## 4 — Build the Tally form (15 min)

Create a new form at https://tally.so — everything below is optional by default.

**Critical:** set a stable **Reference (ref)** on each field (the `{@key}` in Tally's "Reference" setting). The Edge Function reads by ref first, then falls back to label. Using refs makes your form rename-safe.

### Field spec

| Section              | Label                          | Ref                       | Tally field type         | Notes                                                                                 |
| -------------------- | ------------------------------ | ------------------------- | ------------------------ | ------------------------------------------------------------------------------------- |
| Decision maker       | Your name                      | `contact_name`            | Short text               |                                                                                       |
|                      | Email                          | `contact_email`           | Email                    | The only field we recommend making "required" — everything else optional.             |
|                      | Role / title                   | `contact_role`            | Short text               |                                                                                       |
|                      | Company                        | `company_name`            | Short text               |                                                                                       |
|                      | Website                        | `company_website`         | URL                      |                                                                                       |
| Project overview     | Project title                  | `project_title`           | Short text               |                                                                                       |
|                      | One-paragraph overview         | `project_summary`         | Long text                |                                                                                       |
|                      | Project type                   | `project_type`            | Dropdown                 | Options e.g. `Website`, `Web app`, `Mobile app`, `Branding`, `Automation`, `Other`.   |
| Goals & vision       | Goals                          | `goals`                   | Long text                |                                                                                       |
|                      | Success metrics / KPIs         | `success_metrics`         | Long text                |                                                                                       |
|                      | Vision                         | `vision`                  | Long text                |                                                                                       |
|                      | Inspiration links (1/line)     | `inspiration_links`       | Long text                | Normalized to `text[]` splitting on newlines / commas.                                |
| Features             | Must-have features             | `must_have_features`      | Long text                |                                                                                       |
|                      | Nice-to-have features          | `nice_to_have_features`   | Long text                |                                                                                       |
| Branding & assets    | Existing brand?                | `has_existing_brand`      | Yes/No                   |                                                                                       |
|                      | Brand notes                    | `brand_notes`             | Long text                |                                                                                       |
|                      | Logo / asset uploads           | _(any label)_             | **File upload**          | URLs auto-collected into `asset_urls`; label/ref not strictly required.               |
| Technical            | Preferred tech / stack         | `tech_preferences`        | Long text                |                                                                                       |
|                      | Integrations                   | `integrations`            | Long text                |                                                                                       |
|                      | Hosting preferences            | `hosting_preferences`     | Short text               |                                                                                       |
| Budget & timeline    | Budget band                    | `budget_band`             | Multiple choice          | Options: `Under $5k`, `$5k–$15k`, `$15k–$50k`, `$50k–$100k`, `Over $100k`, `Unknown`. |
|                      | Exact budget (optional)        | `budget_exact_amount`     | Number                   |                                                                                       |
|                      | Currency                       | `budget_currency`         | Short text               | Defaults to `USD` in DB if blank.                                                     |
|                      | Timeline                       | `timeline`                | Multiple choice          | Options: `ASAP`, `< 1 month`, `1–3 months`, `3–6 months`, `Flexible`, `Unknown`.      |
|                      | Timeline notes                 | `timeline_notes`          | Long text                |                                                                                       |
| Open                 | Anything else?                 | `open_notes`              | Long text                |                                                                                       |

### Wire Tally to the Edge Function

1. Tally form → **Integrations → Webhooks → New webhook**.
2. URL: `https://YOUR_REF.supabase.co/functions/v1/intake-webhook`
3. Copy Tally's **Signing secret** and save it to Supabase:
   ```bash
   supabase secrets set TALLY_SIGNING_SECRET=whsec_the_value_tally_showed_you
   ```
4. Send a test submission. You should see a new row in `project_intakes` within ~2 seconds.

### Branding

Tally's free tier allows: custom colors, logo, custom URL (`tally.so/r/your-slug`), and a custom thank-you page. Point the form's primary color at the Citron primary (check `@citron-systems/citron-ds` for the exact hex) to keep the public-facing form brand-aligned.

## 5 — Wire env vars into this Sales module (3 min)

```bash
cp .env.example .env.local
# edit and fill:
#   VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
#   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Then `npm run dev`, open the module, switch the top-right toggle to **Intake**.

For the deployed host CRM, add those two variables to the Vercel project for this remote and redeploy.

> **Note on auth:** With migration `0002_…` applied, the **anon** key can read/update intakes for this embedded module. For stricter production setups, remove those policies and use Supabase Auth (or JWT policies that match your host).

## 6 — (Optional) Confirmation email + internal Slack ping

Tally supports both natively — no Zapier needed:

- **Integrations → Email notifications**: auto-send a branded thank-you to the respondent.
- **Integrations → Slack**: post every submission into `#intake` with a link to the Tally response.

If you want the Slack message to include the AI summary, extend the Edge Function with a `fetch(SLACK_WEBHOOK_URL, …)` call after a successful insert.

---

## Tagging rules

Applied by the Edge Function on insert. All tags live in `project_intakes.tags text[]` and are GIN-indexed.

| Tag                 | Condition                                                                       |
| ------------------- | ------------------------------------------------------------------------------- |
| `missing_assets`    | No files uploaded.                                                              |
| `unclear_scope`     | Combined length of summary + goals + must-haves + vision < 40 characters.       |
| `missing_contact`   | No `contact_email`.                                                             |
| `high_budget`       | `budget_band` is `band_50k_100k` / `over_100k`, or `budget_exact_amount ≥ 50k`. |
| `urgent`            | `timeline` is `asap` or `lt_1_month`.                                           |
| `unknown_budget`    | Both `budget_band` and `budget_exact_amount` are null.                          |
| `unknown_timeline`  | `timeline` is null.                                                             |

Add or change rules inside `computeTags()` in `supabase/functions/intake-webhook/index.ts` and redeploy the function — the database schema doesn't change.

---

## Data model quick reference

```
project_intakes
├── id                       uuid pk
├── created_at / updated_at  timestamptz
├── source                   text ('tally')
├── external_submission_id   text unique
├── contact_*                text
├── company_*                text
├── project_title/summary/type text
├── goals / success_metrics / vision text
├── inspiration_links        text[]
├── must_have_features / nice_to_have_features text
├── has_existing_brand       boolean
├── brand_notes              text
├── asset_urls               text[]
├── tech_preferences / integrations / hosting_preferences text
├── budget_band              enum
├── budget_exact_amount      numeric
├── budget_currency          text (default 'USD')
├── timeline                 enum
├── timeline_notes           text
├── open_notes               text
├── tags                     text[]        ← auto-populated
├── ai_summary / ai_model / ai_generated_at  ← auto-populated
├── status                   enum          ← workflow: new → reviewed → qualified → converted / archived
├── assigned_to              text
├── internal_notes           text
└── raw_payload              jsonb         ← full Tally webhook body, never lost
```

---

## Scaling path

The system is built to carry 1k+ intakes without redesign. If you outgrow it:

| Upgrade                             | What changes                                                                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Replace Tally with a Citron-native public form | Swap the public form; **keep the Supabase schema and Edge Function**. Post directly from the form to the same webhook. |
| Bigger AI pipeline                  | Route the Edge Function through Vercel AI Gateway (free, adds observability + model failover) instead of direct OpenAI.     |
| Multi-tenant                        | Add `workspace_id uuid` + tighten RLS. Everything else is unaffected.                                                        |
| File storage governance             | Replace Tally-hosted files with Supabase Storage — add a presigned-upload step to the public form. `asset_urls` stays stable. |

---

## Troubleshooting

- **`401 Invalid signature` in Supabase function logs** — Tally signing secret mismatch. Re-copy from Tally → re-run `supabase secrets set`.
- **Row inserted but `ai_summary` is null** — no `OPENAI_API_KEY` set, or OpenAI returned an error. Check function logs; inserts still succeed.
- **Intake list empty or RLS errors with anon** — apply `0002_…` migration so `anon` can `select` / `update`, or use Supabase Auth and rely on the `authenticated` policies only.
- **Changed the form schema and worried about old data** — don't be. Old rows keep all their columns, and `raw_payload` has every original byte from the old submissions.
