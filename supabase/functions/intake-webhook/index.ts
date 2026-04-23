// Citron — Tally → Supabase intake webhook.
//
// Flow:
//   1. Verify Tally's HMAC signature (optional but recommended).
//   2. Flatten Tally's `data.fields[]` into a { ref | label → value } map.
//   3. Normalize into the `project_intakes` schema (everything optional).
//   4. Rule-based auto-tagging (missing_assets, unclear_scope, high_budget, …).
//   5. Generate a short AI summary via OpenAI (skipped if key missing — never fails insert).
//   6. Insert with service_role (bypasses RLS).
//
// This function is idempotent on `external_submission_id`.
//
// Required secrets (set via `supabase secrets set`):
//   SUPABASE_URL                (auto-populated on hosted functions)
//   SUPABASE_SERVICE_ROLE_KEY   (auto-populated)
//   TALLY_SIGNING_SECRET        (optional — strongly recommended)
//   OPENAI_API_KEY              (optional — AI summary is skipped if absent)
//   OPENAI_MODEL                (optional — defaults to "gpt-4o-mini")

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// ---------- Types ----------------------------------------------------------

interface TallyField {
  key?: string;
  label?: string;
  type?: string;
  value?: unknown;
  options?: Array<{ id: string; text: string }>;
}

interface TallyWebhook {
  eventId?: string;
  eventType?: string;
  createdAt?: string;
  data?: {
    responseId?: string;
    submissionId?: string;
    formId?: string;
    formName?: string;
    createdAt?: string;
    fields?: TallyField[];
  };
}

type Intake = {
  source: string;
  external_submission_id: string | null;
  external_form_id: string | null;

  contact_name: string | null;
  contact_email: string | null;
  contact_role: string | null;
  company_name: string | null;
  company_website: string | null;

  project_title: string | null;
  project_summary: string | null;
  project_type: string | null;

  goals: string | null;
  success_metrics: string | null;
  vision: string | null;
  inspiration_links: string[] | null;

  must_have_features: string | null;
  nice_to_have_features: string | null;

  has_existing_brand: boolean | null;
  brand_notes: string | null;
  asset_urls: string[] | null;

  tech_preferences: string | null;
  integrations: string | null;
  hosting_preferences: string | null;

  budget_band:
    | "under_5k"
    | "band_5k_15k"
    | "band_15k_50k"
    | "band_50k_100k"
    | "over_100k"
    | "unknown"
    | null;
  budget_exact_amount: number | null;
  budget_currency: string | null;
  timeline:
    | "asap"
    | "lt_1_month"
    | "within_1_3_months"
    | "within_3_6_months"
    | "flexible"
    | "unknown"
    | null;
  timeline_notes: string | null;

  open_notes: string | null;

  tags: string[];
  ai_summary: string | null;
  ai_model: string | null;
  ai_generated_at: string | null;

  raw_payload: unknown;
};

// ---------- Helpers --------------------------------------------------------

/** Flatten Tally's fields[] into a map keyed first by `key` (stable ref) then by a lowercased label fallback. */
function flattenFields(fields: TallyField[] | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!fields) return out;
  for (const f of fields) {
    const value = resolveOptionValue(f);
    if (f.key) out[f.key] = value;
    if (f.label) out[`label:${f.label.trim().toLowerCase()}`] = value;
  }
  return out;
}

/** Tally dropdowns/checkboxes send value = array of option ids. Resolve back to text. */
function resolveOptionValue(f: TallyField): unknown {
  if (!f.options || !Array.isArray(f.value)) return f.value;
  const map = new Map(f.options.map((o) => [o.id, o.text]));
  const texts = (f.value as string[]).map((id) => map.get(id) ?? id);
  return texts.length === 1 ? texts[0] : texts;
}

function pick(
  map: Record<string, unknown>,
  refs: string[],
): unknown {
  for (const ref of refs) {
    const direct = map[ref];
    if (direct !== undefined && direct !== null && direct !== "") return direct;
    const byLabel = map[`label:${ref.toLowerCase()}`];
    if (byLabel !== undefined && byLabel !== null && byLabel !== "") {
      return byLabel;
    }
  }
  return null;
}

function asText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.filter(Boolean).join(", ") || null;
  if (typeof v === "string") return v.trim() || null;
  return String(v);
}

function asStringArray(v: unknown): string[] | null {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) {
    const arr = v.map((x) => String(x).trim()).filter(Boolean);
    return arr.length ? arr : null;
  }
  const text = String(v);
  const parts = text
    .split(/[\n,]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : null;
}

function asNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function asBoolean(v: unknown): boolean | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["yes", "true", "y", "1"].includes(s)) return true;
  if (["no", "false", "n", "0"].includes(s)) return false;
  return null;
}

function normalizeBudgetBand(v: unknown): Intake["budget_band"] {
  const t = asText(v)?.toLowerCase() ?? "";
  if (!t) return null;
  if (t.includes("under") || t.includes("< 5") || t.includes("<5")) return "under_5k";
  if (t.includes("5") && (t.includes("15") || t.includes("-15"))) return "band_5k_15k";
  if (t.includes("15") && (t.includes("50") || t.includes("-50"))) return "band_15k_50k";
  if (t.includes("50") && (t.includes("100") || t.includes("-100"))) return "band_50k_100k";
  if (t.includes("over") || t.includes("100k+") || t.includes(">100")) return "over_100k";
  return "unknown";
}

function normalizeTimeline(v: unknown): Intake["timeline"] {
  const t = asText(v)?.toLowerCase() ?? "";
  if (!t) return null;
  if (t.includes("asap") || t.includes("immediate")) return "asap";
  if (t.includes("1 month") || t.includes("< 1")) return "lt_1_month";
  if (t.includes("1-3") || t.includes("1–3") || (t.includes("1") && t.includes("3"))) {
    return "within_1_3_months";
  }
  if (t.includes("3-6") || t.includes("3–6")) return "within_3_6_months";
  if (t.includes("flex")) return "flexible";
  return "unknown";
}

/** Extract file URLs from Tally file-upload fields (value is an array of { url, name, ... }). */
function extractAssetUrls(fields: TallyField[] | undefined): string[] | null {
  if (!fields) return null;
  const urls: string[] = [];
  for (const f of fields) {
    if (!Array.isArray(f.value)) continue;
    for (const v of f.value as any[]) {
      if (v && typeof v === "object" && typeof v.url === "string") urls.push(v.url);
    }
  }
  return urls.length ? urls : null;
}

// ---------- HMAC verification ---------------------------------------------

async function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
): Promise<boolean> {
  if (!secret) return true; // signing not configured — skip
  if (!signatureHeader) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return signatureHeader === hex || signatureHeader === b64;
}

// ---------- Rule-based tagging --------------------------------------------

function computeTags(i: Intake): string[] {
  const tags = new Set<string>();

  if (!i.asset_urls || i.asset_urls.length === 0) tags.add("missing_assets");

  const scopeText = [
    i.project_summary,
    i.goals,
    i.must_have_features,
    i.vision,
  ]
    .filter(Boolean)
    .join(" ");
  if (scopeText.trim().length < 40) tags.add("unclear_scope");

  if (!i.contact_email) tags.add("missing_contact");

  if (
    i.budget_band === "band_50k_100k" ||
    i.budget_band === "over_100k" ||
    (i.budget_exact_amount !== null && i.budget_exact_amount >= 50000)
  ) {
    tags.add("high_budget");
  }

  if (i.timeline === "asap" || i.timeline === "lt_1_month") tags.add("urgent");

  if (!i.budget_band && i.budget_exact_amount === null) tags.add("unknown_budget");

  if (!i.timeline) tags.add("unknown_timeline");

  return [...tags];
}

// ---------- AI summary -----------------------------------------------------

async function generateSummary(i: Intake): Promise<{ summary: string; model: string } | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;
  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

  const dossier = JSON.stringify(
    {
      project_title: i.project_title,
      project_type: i.project_type,
      project_summary: i.project_summary,
      goals: i.goals,
      success_metrics: i.success_metrics,
      vision: i.vision,
      must_have_features: i.must_have_features,
      nice_to_have_features: i.nice_to_have_features,
      tech_preferences: i.tech_preferences,
      integrations: i.integrations,
      budget_band: i.budget_band,
      budget_exact_amount: i.budget_exact_amount,
      timeline: i.timeline,
      timeline_notes: i.timeline_notes,
      open_notes: i.open_notes,
    },
    null,
    2,
  );

  const systemPrompt =
    "You summarize a freelance/agency intake submission in 3–5 concise bullet " +
    "points totalling ≤ 90 words. Note missing critical info. Do NOT invent details. " +
    "Plain text only — no markdown headers.";

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Intake data:\n${dossier}` },
        ],
      }),
    });
    if (!resp.ok) {
      console.warn("OpenAI summary failed", resp.status, await resp.text());
      return null;
    }
    const json = await resp.json();
    const summary: string | undefined = json.choices?.[0]?.message?.content?.trim();
    if (!summary) return null;
    return { summary, model };
  } catch (e) {
    console.warn("OpenAI summary exception", e);
    return null;
  }
}

// ---------- Main handler ---------------------------------------------------

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signature =
    req.headers.get("tally-signature") ?? req.headers.get("x-tally-signature");
  const signingSecret = Deno.env.get("TALLY_SIGNING_SECRET");

  if (!(await verifySignature(rawBody, signature, signingSecret))) {
    console.warn("Tally signature verification failed");
    return new Response("Invalid signature", { status: 401 });
  }

  let webhook: TallyWebhook;
  try {
    webhook = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const fields = flattenFields(webhook.data?.fields);

  const intake: Intake = {
    source: "tally",
    external_submission_id: webhook.data?.submissionId ?? webhook.data?.responseId ?? null,
    external_form_id: webhook.data?.formId ?? null,

    contact_name: asText(pick(fields, ["contact_name", "name", "full name"])),
    contact_email: asText(pick(fields, ["contact_email", "email"])),
    contact_role: asText(pick(fields, ["contact_role", "role", "title"])),
    company_name: asText(pick(fields, ["company_name", "company"])),
    company_website: asText(pick(fields, ["company_website", "website", "url"])),

    project_title: asText(pick(fields, ["project_title", "title"])),
    project_summary: asText(pick(fields, ["project_summary", "overview", "project overview"])),
    project_type: asText(pick(fields, ["project_type", "type of project"])),

    goals: asText(pick(fields, ["goals"])),
    success_metrics: asText(pick(fields, ["success_metrics", "success metrics", "kpis"])),
    vision: asText(pick(fields, ["vision", "inspiration"])),
    inspiration_links: asStringArray(
      pick(fields, ["inspiration_links", "inspiration links", "references"]),
    ),

    must_have_features: asText(pick(fields, ["must_have_features", "must-haves", "must haves"])),
    nice_to_have_features: asText(
      pick(fields, ["nice_to_have_features", "nice-to-haves", "nice to haves"]),
    ),

    has_existing_brand: asBoolean(pick(fields, ["has_existing_brand", "existing brand?"])),
    brand_notes: asText(pick(fields, ["brand_notes", "brand notes", "branding"])),
    asset_urls: extractAssetUrls(webhook.data?.fields),

    tech_preferences: asText(pick(fields, ["tech_preferences", "tech stack", "technical requirements"])),
    integrations: asText(pick(fields, ["integrations"])),
    hosting_preferences: asText(pick(fields, ["hosting_preferences", "hosting"])),

    budget_band: normalizeBudgetBand(pick(fields, ["budget_band", "budget"])),
    budget_exact_amount: asNumber(pick(fields, ["budget_exact_amount", "exact budget"])),
    budget_currency: asText(pick(fields, ["budget_currency", "currency"])) ?? "USD",
    timeline: normalizeTimeline(pick(fields, ["timeline"])),
    timeline_notes: asText(pick(fields, ["timeline_notes", "timeline notes"])),

    open_notes: asText(pick(fields, ["open_notes", "anything else", "notes"])),

    tags: [],
    ai_summary: null,
    ai_model: null,
    ai_generated_at: null,

    raw_payload: webhook,
  };

  intake.tags = computeTags(intake);

  const ai = await generateSummary(intake);
  if (ai) {
    intake.ai_summary = ai.summary;
    intake.ai_model = ai.model;
    intake.ai_generated_at = new Date().toISOString();
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase
    .from("project_intakes")
    .upsert(intake, { onConflict: "external_submission_id", ignoreDuplicates: false })
    .select("id")
    .single();

  if (error) {
    console.error("Insert failed", error, intake);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ ok: true, id: data?.id, tags: intake.tags, ai: Boolean(ai) }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
