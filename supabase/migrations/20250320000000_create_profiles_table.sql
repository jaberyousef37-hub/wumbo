-- Profiles table — one row per user, username is the unique identifier
create table if not exists public.profiles (
  username text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Allow anonymous read (so others can search for you)
create policy "Allow anonymous read profiles"
  on public.profiles for select to anon using (true);

-- Allow anonymous insert/upsert
create policy "Allow anonymous insert profiles"
  on public.profiles for insert to anon with check (true);

-- Allow anonymous update (e.g. name change)
create policy "Allow anonymous update profiles"
  on public.profiles for update to anon using (true) with check (true);
