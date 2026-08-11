-- RamSpace workspace schema: user-owned folders and document metadata.

-- Folders: one-level, user-owned.
create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Documents: metadata only. storage_path is NULL until Supabase Storage
-- integration (Phase 4). folder_id uses ON DELETE RESTRICT: a folder with
-- documents cannot be deleted, preventing accidental orphaned metadata.
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  folder_id uuid references public.folders (id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 255),
  file_type text not null default 'pdf',
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_opened_at timestamptz
);

-- Lookup indexes.
create index folders_user_id_idx on public.folders (user_id);
create index documents_user_id_idx on public.documents (user_id);
create index documents_folder_id_idx on public.documents (folder_id);
create index documents_user_recent_idx on public.documents (user_id, last_opened_at desc);

-- Shared updated_at maintenance.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger folders_set_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();
