-- Optional link to auth user for hosted rooms (nullable for legacy / anon flows)
alter table public.rooms add column if not exists host_id uuid references auth.users (id) on delete set null;

comment on column public.rooms.host_id is 'Set to auth.uid() when the room creator is logged in; null for anonymous sessions.';

-- Idempotent re-runs
drop policy if exists "Allow authenticated select" on public.rooms;
drop policy if exists "Allow authenticated update" on public.rooms;
drop policy if exists "Users can create rooms" on public.rooms;

-- Existing policies only target "anon". JWT sessions use role "authenticated" and had no policies → insert/select/update failed.
create policy "Allow authenticated select"
  on public.rooms
  for select
  to authenticated
  using (true);

create policy "Allow authenticated update"
  on public.rooms
  for update
  to authenticated
  using (true)
  with check (true);

-- Inserts from logged-in users must set host_id to their user id (see app insert)
create policy "Users can create rooms"
  on public.rooms
  for insert
  to authenticated
  with check (auth.uid() = host_id);
