-- RamSpace Phase 4: private cloud document storage.
--
-- Creates the private "documents" bucket (idempotent) and Row Level
-- Security policies on storage.objects. Objects are stored under
-- {user_id}/{document_id}/{filename}, and every policy verifies that the
-- first path segment equals the authenticated user id, so users can only
-- reach their own objects. There is no UPDATE policy: files are never
-- modified in place during Phase 4. There are no public policies and no
-- service-role usage.

-- Bucket: private, PDF-only, 25 MB per file (matches the application
-- default in NEXT_PUBLIC_MAX_UPLOAD_MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 26214400, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Read: only the owner can see an object (path prefix = auth.uid()).
create policy "documents_storage_select_own"
  on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Write: only the owner can create objects under their own prefix.
create policy "documents_storage_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Delete: only the owner can remove their own objects.
create policy "documents_storage_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
