-- Row Level Security for the RamSpace workspace.
-- Every policy scopes to the authenticated user via auth.uid().
-- There are no public policies and no service-role usage.

alter table public.folders enable row level security;
alter table public.documents enable row level security;

-- Folders: users own their own rows.
create policy "folders_select_own"
  on public.folders
  for select
  using (auth.uid() = user_id);

create policy "folders_insert_own"
  on public.folders
  for insert
  with check (auth.uid() = user_id);

create policy "folders_update_own"
  on public.folders
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "folders_delete_own"
  on public.folders
  for delete
  using (auth.uid() = user_id);

-- Documents: users own their own rows.
create policy "documents_select_own"
  on public.documents
  for select
  using (auth.uid() = user_id);

create policy "documents_insert_own"
  on public.documents
  for insert
  with check (auth.uid() = user_id);

create policy "documents_update_own"
  on public.documents
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "documents_delete_own"
  on public.documents
  for delete
  using (auth.uid() = user_id);
