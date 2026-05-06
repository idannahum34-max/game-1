create table if not exists public.rooms (
  id text primary key,
  name text not null,
  host_id text,
  phase text not null default 'lobby',
  game_state jsonb not null default '{}',
  selected_packs jsonb not null default '[]',
  secrets jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade,
  name text not null,
  score integer not null default 0,
  hand jsonb not null default '[]',
  is_host boolean not null default false,
  connected boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.players enable row level security;

drop policy if exists "rooms_public_read" on public.rooms;
drop policy if exists "rooms_public_insert" on public.rooms;
drop policy if exists "rooms_public_update" on public.rooms;
drop policy if exists "players_public_read" on public.players;
drop policy if exists "players_public_insert" on public.players;
drop policy if exists "players_public_update" on public.players;

create policy "rooms_public_read" on public.rooms for select using (true);
create policy "rooms_public_insert" on public.rooms for insert with check (true);
create policy "rooms_public_update" on public.rooms for update using (true);

create policy "players_public_read" on public.players for select using (true);
create policy "players_public_insert" on public.players for insert with check (true);
create policy "players_public_update" on public.players for update using (true);
