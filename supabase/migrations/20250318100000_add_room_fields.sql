-- Add game_type, host_name, status to rooms table
alter table public.rooms add column if not exists game_type text not null default 'tictactoe';
alter table public.rooms add column if not exists host_name text;
alter table public.rooms add column if not exists status text not null default 'waiting' check (status in ('waiting', 'playing'));
