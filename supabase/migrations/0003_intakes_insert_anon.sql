-- Manual intakes from the embedded CRM (Vite + anon / publishable key).
-- Tally and other public forms can still use the Edge Function with service role.

drop policy if exists "intakes_insert_anon" on project_intakes;
create policy "intakes_insert_anon"
  on project_intakes
  for insert
  to anon
  with check (true);
