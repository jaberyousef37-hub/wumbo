-- Create rooms table for Tic Tac Toe
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  players jsonb not null default '["X"]',
  board jsonb not null default '[null,null,null,null,null,null,null,null,null]',
  turn text not null default 'X' check (turn in ('X', 'O')),
  winner text check (winner is null or winner in ('X', 'O')),
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.rooms enable row level security;

-- Allow anonymous read
create policy "Allow anonymous read"
  on public.rooms
  for select
  to anon
  using (true);

-- Allow anonymous insert
create policy "Allow anonymous insert"
  on public.rooms
  for insert
  to anon
  with check (true);

-- Allow anonymous update
create policy "Allow anonymous update"
  on public.rooms
  for update
  to anon
  using (true)
  with check (true);

-- Enable Realtime
alter publication supabase_realtime add table public.rooms;
