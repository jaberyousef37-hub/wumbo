-- Create messages table for chat rooms
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  sender_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.messages enable row level security;

-- Allow anonymous read access (for loading messages)
create policy "Allow anonymous read"
  on public.messages
  for select
  to anon
  using (true);

-- Allow anonymous insert (for sending messages as Guest)
create policy "Allow anonymous insert"
  on public.messages
  for insert
  to anon
  with check (true);

-- Enable Realtime for postgres_changes
alter publication supabase_realtime add table public.messages;
