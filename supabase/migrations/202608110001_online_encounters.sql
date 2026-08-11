-- Encontros compartilhados entre os computadores de Victor e Vitória.

create table if not exists public.scheduled_encounters (
  encounter_date date primary key,
  kind text not null check (kind in ('lived', 'planned')),
  outing varchar(40) not null check (
    outing in ('Restaurante', 'Cinema', 'Parque ou praia', 'Café ou confeitaria', 'Passeio surpresa', 'Outro lugar')
  ),
  place varchar(120) not null check (length(trim(place)) between 2 and 120),
  description varchar(1000) not null check (length(trim(description)) between 3 and 1000),
  roulette_idea varchar(100) check (roulette_idea is null or length(trim(roulette_idea)) between 2 and 100),
  created_at timestamptz not null default now()
);

alter table public.scheduled_encounters enable row level security;

drop policy if exists "Encontros são públicos" on public.scheduled_encounters;
create policy "Encontros são públicos"
  on public.scheduled_encounters for select
  to anon, authenticated
  using (true);

drop policy if exists "Visitantes criam encontros válidos" on public.scheduled_encounters;
create policy "Visitantes criam encontros válidos"
  on public.scheduled_encounters for insert
  to anon, authenticated
  with check (
    encounter_date between date '2025-01-01' and date '2035-12-31'
    and kind in ('lived', 'planned')
    and length(trim(place)) between 2 and 120
    and length(trim(description)) between 3 and 1000
  );

drop policy if exists "Editores atualizam encontros" on public.scheduled_encounters;
create policy "Editores atualizam encontros"
  on public.scheduled_encounters for update
  to authenticated
  using (public.is_site_editor())
  with check (public.is_site_editor());

drop policy if exists "Editores removem encontros" on public.scheduled_encounters;
create policy "Editores removem encontros"
  on public.scheduled_encounters for delete
  to authenticated
  using (public.is_site_editor());

grant select, insert on public.scheduled_encounters to anon, authenticated;
grant update, delete on public.scheduled_encounters to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'scheduled_encounters'
  ) then
    alter publication supabase_realtime add table public.scheduled_encounters;
  end if;
end
$$;

-- Recupera a escolha que chegou por e-mail em 11/08/2026.
insert into public.scheduled_encounters (
  encounter_date,
  kind,
  outing,
  place,
  description,
  roulette_idea
)
values (
  date '2026-11-02',
  'planned',
  'Parque ou praia',
  'Praia',
  'segredo',
  null
)
on conflict (encounter_date) do nothing;
