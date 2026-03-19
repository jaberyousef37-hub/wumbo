# Supabase Setup

## Migrations

Run migrations in order:

1. Go to your [Supabase Dashboard](https://app.supabase.com) → SQL Editor
2. Paste and run the contents of each migration file in `migrations/`

If you get an error that a table is already in the publication, go to **Database → Publications → supabase_realtime** and toggle on the table.

Or, if using the Supabase CLI:

```bash
supabase db push
```

## Messages Table

`migrations/20250317000000_create_messages_table.sql`

| Column       | Type         | Description                    |
| ------------ | ------------ | ------------------------------ |
| id           | uuid         | Primary key (auto-generated)   |
| room_id      | text         | Chat room ID (e.g. "1", "2")   |
| sender_name  | text         | Display name (e.g. "Guest")    |
| content      | text         | Message body                   |
| created_at   | timestamptz  | Timestamp (auto-generated)     |

## Rooms Table (Tic Tac Toe)

`migrations/20250318000000_create_rooms_table.sql`

| Column     | Type        | Description                                      |
| ---------- | ----------- | ------------------------------------------------ |
| id         | uuid        | Primary key (auto-generated)                     |
| code       | text        | 4-digit room code (unique)                       |
| players    | jsonb       | Array of player symbols, e.g. `["X", "O"]`       |
| board      | jsonb       | 9-cell array, e.g. `[null,"X",null,...]`         |
| turn       | text        | Current turn: `"X"` or `"O"`                     |
| winner     | text        | Winner: `"X"`, `"O"`, or `null`                  |
| created_at | timestamptz | Timestamp (auto-generated)                       |
