-- ============================================================================
-- RLS membership fix
-- ----------------------------------------------------------------------------
-- The original policies only checked that the *workbench row exists*
--   USING (EXISTS (SELECT 1 FROM workbenches WHERE id = tbl.workbench_id))
-- which evaluates to TRUE for every authenticated user — i.e. any user could
-- read/write any workbench's data. These policies tie access to actual
-- membership in workbench_members via auth.uid().
--
-- Apply with the Supabase SQL editor (or `supabase db push`). Idempotent.
--
-- NOTE: the FastAPI backend currently uses the SERVICE-ROLE key, which BYPASSES
-- RLS entirely. RLS protects only the direct frontend -> Supabase access paths
-- (DocVault, chat_feedback, etc.). Securing the FastAPI endpoints additionally
-- requires per-request JWT verification — see backend/auth.py.
-- ============================================================================

-- Helper: is the current user a member of the given workbench?
create or replace function public.is_workbench_member(wb uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workbench_members m
    where m.workbench_id = wb
      and m.user_id = auth.uid()
  );
$$;

-- Helper: does the current user hold one of the given roles in the workbench?
create or replace function public.has_workbench_role(wb uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workbench_members m
    where m.workbench_id = wb
      and m.user_id = auth.uid()
      and m.role = any(roles)
  );
$$;

-- ---- parties ----
drop policy if exists "Users can manage parties in their workbenches" on parties;
create policy "Members can read parties" on parties
  for select using (public.is_workbench_member(parties.workbench_id));
create policy "Ops can write parties" on parties
  for all
  using (public.has_workbench_role(parties.workbench_id, array['founder','ca','analyst']))
  with check (public.has_workbench_role(parties.workbench_id, array['founder','ca','analyst']));

-- ---- entities (scoped through their party's workbench) ----
drop policy if exists "Users can manage entities in their parties" on entities;
create policy "Members can manage entities" on entities
  for all
  using (exists (
    select 1 from parties p
    where p.id = entities.party_id
      and public.is_workbench_member(p.workbench_id)
  ))
  with check (exists (
    select 1 from parties p
    where p.id = entities.party_id
      and public.has_workbench_role(p.workbench_id, array['founder','ca','analyst'])
  ));

-- ---- projects ----
drop policy if exists "Users can manage projects in their workbenches" on projects;
create policy "Members can read projects" on projects
  for select using (public.is_workbench_member(projects.workbench_id));
create policy "Ops can write projects" on projects
  for all
  using (public.has_workbench_role(projects.workbench_id, array['founder','ca','analyst']))
  with check (public.has_workbench_role(projects.workbench_id, array['founder','ca','analyst']));

-- ---- budgets ----
drop policy if exists "Users can manage budgets in their workbenches" on budgets;
create policy "Members can read budgets" on budgets
  for select using (public.is_workbench_member(budgets.workbench_id));
create policy "Ops can write budgets" on budgets
  for all
  using (public.has_workbench_role(budgets.workbench_id, array['founder','ca','analyst']))
  with check (public.has_workbench_role(budgets.workbench_id, array['founder','ca','analyst']));

-- ---- workbench_documents ----
drop policy if exists "Users can manage documents in their workbenches" on workbench_documents;
create policy "Members can read documents" on workbench_documents
  for select using (public.is_workbench_member(workbench_documents.workbench_id));
create policy "Ops can write documents" on workbench_documents
  for all
  using (public.has_workbench_role(workbench_documents.workbench_id, array['founder','ca','analyst']))
  with check (public.has_workbench_role(workbench_documents.workbench_id, array['founder','ca','analyst']));

-- ---- items ----
drop policy if exists "Users can manage items in their workbenches" on items;
create policy "Members can read items" on items
  for select using (public.is_workbench_member(items.workbench_id));
create policy "Ops can write items" on items
  for all
  using (public.has_workbench_role(items.workbench_id, array['founder','ca','analyst']))
  with check (public.has_workbench_role(items.workbench_id, array['founder','ca','analyst']));

-- ---- stock_ledger (scoped through its item's workbench) ----
drop policy if exists "Users can manage stock ledger for their items" on stock_ledger;
create policy "Members can manage stock ledger" on stock_ledger
  for all
  using (exists (
    select 1 from items i
    where i.id = stock_ledger.item_id
      and public.is_workbench_member(i.workbench_id)
  ))
  with check (exists (
    select 1 from items i
    where i.id = stock_ledger.item_id
      and public.has_workbench_role(i.workbench_id, array['founder','ca','analyst'])
  ));
