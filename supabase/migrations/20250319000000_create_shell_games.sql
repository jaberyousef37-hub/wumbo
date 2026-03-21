-- Shell Game multiplayer table
create table if not exists public.shell_games (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  host_name text not null,
  guesser_name text,
  ball_position smallint check (ball_position is null or ball_position in (0, 1, 2)),
  shuffle_sequence jsonb not null default '[]',
  game_phase text not null default 'hiding' check (game_phase in ('hiding', 'watching', 'shuffling', 'guessing', 'result')),
  winner text check (winner in ('host', 'guesser')),
  guesser_choice smallint check (guesser_choice in (0, 1, 2)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.shell_games enable row level security;

-- Allow anonymous read
create policy "Allow anonymous read shell_games"
  on public.shell_games for select to anon using (true);

-- Allow anonymous insert
create policy "Allow anonymous insert shell_games"
  on public.shell_games for insert to anon with check (true);

-- Allow anonymous update
create policy "Allow anonymous update shell_games"
  on public.shell_games for update to anon using (true) with check (true);

-- Enable Realtime for shell_games
alter publication supabase_realtime add table public.shell_games;
