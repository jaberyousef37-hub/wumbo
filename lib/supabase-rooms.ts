/**
 * Inserts into public.rooms — columns must match supabase/migrations:
 * 20250318000000_create_rooms_table.sql
 * 20250318100000_add_room_fields.sql
 * 20250321100000_rooms_host_id_authenticated_rls.sql (host_id)
 */
import { supabase } from '@/lib/supabase';

const EMPTY_BOARD: (null | string)[] = [null, null, null, null, null, null, null, null, null];

/** Row shape for insert (id, created_at are DB defaults) */
export type RoomInsertPayload = {
  code: string;
  game_type: string;
  host_name: string;
  players: string[];
  status: 'waiting' | 'playing';
  board: (null | string)[];
  turn: 'X' | 'O';
  winner: string | null;
  /** Required when session is authenticated (RLS: auth.uid() = host_id) */
  host_id?: string | null;
};

export async function insertRoomRow(
  params: Pick<RoomInsertPayload, 'code' | 'game_type' | 'host_name' | 'players'> & {
    board?: (null | string)[];
    turn?: 'X' | 'O';
    winner?: string | null;
    status?: 'waiting' | 'playing';
  }
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const payload: RoomInsertPayload = {
    code: params.code,
    game_type: params.game_type,
    host_name: params.host_name,
    players: params.players,
    status: params.status ?? 'waiting',
    board: params.board ?? [...EMPTY_BOARD],
    turn: params.turn ?? 'X',
    winner: params.winner ?? null,
  };

  if (session?.user?.id) {
    payload.host_id = session.user.id;
  }

  console.log('Creating room payload:', payload);

  const { data, error } = await supabase.from('rooms').insert(payload).select('id').single();

  if (error) {
    console.error('Room creation error:', error);
    return { data: null as { id: string } | null, error };
  }

  console.log('Room created successfully:', data);
  return { data, error: null };
}
