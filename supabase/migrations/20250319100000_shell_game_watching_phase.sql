-- If an older DB was created before `watching` was added to the initial migration, widen the check.
alter table public.shell_games
  drop constraint if exists shell_games_game_phase_check;

alter table public.shell_games
  add constraint shell_games_game_phase_check
  check (
    game_phase in ('hiding', 'watching', 'shuffling', 'guessing', 'result')
  );
