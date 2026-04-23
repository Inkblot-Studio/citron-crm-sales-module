-- Embedded CRM module (Vite + anon key) needs to list and update intakes without
-- Supabase Auth if the host app does not wire a Supabase session. The public form
-- still writes only via the Edge Function (service_role).
--
-- Tighten in production: replace these with policies that match your host JWT or
-- require Supabase Auth for the internal team.

drop policy if exists "intakes_select_anon" on project_intakes;
create policy "intakes_select_anon"
  on project_intakes
  for select
  to anon
  using (true);

drop policy if exists "intakes_update_anon" on project_intakes;
create policy "intakes_update_anon"
  on project_intakes
  for update
  to anon
  using (true)
  with check (true);
