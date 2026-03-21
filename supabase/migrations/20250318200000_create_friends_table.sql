-- Friends and friend requests table
create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null,
  receiver_id text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique(sender_id, receiver_id)
);

-- Enable RLS
alter table public.friends enable row level security;

-- Allow anonymous read
create policy "Allow anonymous read friends"
  on public.friends for select to anon using (true);

-- Allow anonymous insert
create policy "Allow anonymous insert friends"
  on public.friends for insert to anon with check (true);

-- Allow anonymous update
create policy "Allow anonymous update friends"
  on public.friends for update to anon using (true) with check (true);
