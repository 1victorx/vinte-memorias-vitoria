-- Endurecimento pós-auditoria: rate limit de encontros anônimos e delete de fotos por pasta.

create table if not exists public.encounter_insert_attempts (
  id bigserial primary key,
  client_key text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists encounter_insert_attempts_key_time_idx
  on public.encounter_insert_attempts (client_key, attempted_at desc);

alter table public.encounter_insert_attempts enable row level security;

revoke all on public.encounter_insert_attempts from public, anon, authenticated;

create or replace function public.enforce_encounter_insert_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client_key text;
  recent_count int;
begin
  if public.is_site_editor() then
    return new;
  end if;

  client_key := coalesce(
    nullif(trim(split_part(
      coalesce(
        current_setting('request.headers', true)::json->>'cf-connecting-ip',
        current_setting('request.headers', true)::json->>'x-real-ip',
        split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1),
        'unknown'
      ),
      ',',
      1
    )), ''),
    'unknown'
  );

  select count(*) into recent_count
  from public.encounter_insert_attempts
  where encounter_insert_attempts.client_key = enforce_encounter_insert_rate_limit.client_key
    and attempted_at > now() - interval '1 hour';

  if recent_count >= 5 then
    raise exception 'encounter_rate_limit_exceeded'
      using errcode = 'P0001';
  end if;

  insert into public.encounter_insert_attempts (client_key)
  values (enforce_encounter_insert_rate_limit.client_key);

  delete from public.encounter_insert_attempts
  where attempted_at < now() - interval '24 hours';

  return new;
end;
$$;

revoke all on function public.enforce_encounter_insert_rate_limit() from public;

drop trigger if exists encounter_insert_rate_limit on public.scheduled_encounters;
create trigger encounter_insert_rate_limit
  before insert on public.scheduled_encounters
  for each row
  execute function public.enforce_encounter_insert_rate_limit();

drop policy if exists "Editores removem fotos" on storage.objects;
create policy "Editores removem fotos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'memory-photos'
    and public.is_site_editor()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
