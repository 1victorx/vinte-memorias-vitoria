-- Memórias que continuam a história depois dos vinte capítulos originais.
-- Execute este arquivo no SQL Editor de um projeto Supabase gratuito.

create extension if not exists pgcrypto;

create table if not exists public.site_editors (
  email text primary key check (email = lower(email) and length(email) between 5 and 254),
  created_at timestamptz not null default now()
);

create table if not exists public.living_memories (
  id uuid primary key default gen_random_uuid(),
  memory_date date not null,
  title varchar(100) not null check (length(trim(title)) between 2 and 100),
  preview varchar(180) not null check (length(trim(preview)) between 3 and 180),
  story text not null check (length(trim(story)) between 10 and 5000),
  secret varchar(300) check (secret is null or length(trim(secret)) between 2 and 300),
  photo_paths text[] not null check (cardinality(photo_paths) between 1 and 6),
  is_published boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists living_memories_date_idx
  on public.living_memories (memory_date, created_at);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'living_memories'
  ) then
    alter publication supabase_realtime add table public.living_memories;
  end if;
end
$$;

alter table public.site_editors enable row level security;
alter table public.living_memories enable row level security;

create or replace function public.is_site_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.site_editors
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_site_editor() from public;
grant execute on function public.is_site_editor() to anon, authenticated;

drop policy if exists "Leitura do próprio editor" on public.site_editors;
create policy "Leitura do próprio editor"
  on public.site_editors for select
  to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "Memórias publicadas são públicas" on public.living_memories;
create policy "Memórias publicadas são públicas"
  on public.living_memories for select
  to anon, authenticated
  using (is_published = true or public.is_site_editor());

drop policy if exists "Editores criam memórias" on public.living_memories;
create policy "Editores criam memórias"
  on public.living_memories for insert
  to authenticated
  with check (public.is_site_editor() and created_by = auth.uid());

drop policy if exists "Editores atualizam memórias" on public.living_memories;
create policy "Editores atualizam memórias"
  on public.living_memories for update
  to authenticated
  using (public.is_site_editor())
  with check (public.is_site_editor());

drop policy if exists "Editores removem memórias" on public.living_memories;
create policy "Editores removem memórias"
  on public.living_memories for delete
  to authenticated
  using (public.is_site_editor());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memory-photos',
  'memory-photos',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Fotos das memórias são públicas" on storage.objects;
create policy "Fotos das memórias são públicas"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'memory-photos');

drop policy if exists "Editores enviam fotos" on storage.objects;
create policy "Editores enviam fotos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'memory-photos'
    and public.is_site_editor()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Editores removem fotos" on storage.objects;
create policy "Editores removem fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'memory-photos' and public.is_site_editor());

-- Troque os exemplos pelos endereços que poderão adicionar novas memórias.
-- insert into public.site_editors (email) values
--   ('victor@exemplo.com'),
--   ('vitoria@exemplo.com');