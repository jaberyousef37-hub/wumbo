import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

export type GameHelpId =
  | 'uno'
  | 'chess'
  | 'snake'
  | 'bs'
  | 'trivia'
  | 'tictactoe'
  | 'shell'
  | 'snakes-ladders'
  | 'would-you-rather';

const HELP: Record<GameHelpId, { title: string; body: string }> = {
  uno: {
    title: 'UNO',
    body: 'Match color or number on the discard pile. Action cards: Skip, Reverse, Draw Two. Wild changes color; Wild Draw Four forces the next player to draw four (if legal). Stack +2s or take the pile. Say UNO! with one card left. First to empty their hand wins.',
  },
  chess: {
    title: 'Chess',
    body: 'You play White (bottom). Tap a piece, then a highlighted square to move. Checkmate wins. Stalemate is a draw. Use Undo to take back the last move. The AI plays Black.',
  },
  snake: {
    title: 'Snake',
    body: 'Swipe on the grid or use arrows to turn. Eat red food to grow and score. Don’t hit walls or yourself. Speed increases as you score.',
  },
  bs: {
    title: 'BS (Bullshit)',
    body: 'Play 1–4 cards face down claiming they match the rank in order (Ace→King). Others can call BS! If the play was a lie, the liar takes the pile; if honest, the caller takes it. First to empty their hand wins.',
  },
  trivia: {
    title: 'Trivia',
    body: 'Answer multiple-choice questions as fast as you can. Correct picks score points. Play solo or with friends in a room.',
  },
  tictactoe: {
    title: 'Tic Tac Toe',
    body: 'Get three in a row on a 3×3 grid. You and your opponent take turns. X usually goes first.',
  },
  shell: {
    title: 'Shell Game',
    body: 'Follow the hidden item under a cup. Host shuffles; guesser picks a cup. Great for quick bluffing fun with a room code.',
  },
  'snakes-ladders': {
    title: 'Snakes & Ladders',
    body: 'Classic 100-square board: move by dice roll from 1 toward 100. Land on a ladder’s bottom to climb up; land on a snake’s head to slide down. You must land exactly on 100 to win — rolling over doesn’t move you. Choose 1–4 players and toggle CPU for AI opponents. Tap Roll on your turn.',
  },
  'would-you-rather': {
    title: 'Would You Rather',
    body: 'Pick solo or friends mode. Each round shows two options — tap left or right. After you choose, animated bars show playful simulated “worldwide” percentages (not real polls). Use Next question to continue; in friends mode, the turn label rotates so you pass the phone.',
  },
};

type Props = {
  gameId: GameHelpId;
  /** Icon and text color on the game header */
  tint?: string;
};

export function HowToPlayButton({ gameId, tint = '#fff' }: Props) {
  const [open, setOpen] = useState(false);
  const content = HELP[gameId];
  const onClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
        hitSlop={8}
      >
        <MaterialIcons name="help-outline" size={20} color={tint} />
        <Text style={[styles.btnText, { color: tint }]}>How to play</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>{content.title}</Text>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.body}>{content.body}</Text>
            </ScrollView>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  btnText: { fontSize: 13, fontWeight: '700' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: AppColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    padding: 20,
    maxHeight: '70%',
  },
  title: {
    color: AppColors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  scroll: { maxHeight: 320 },
  body: {
    color: AppColors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  closeBtn: {
    marginTop: 16,
    alignSelf: 'center',
    backgroundColor: AppColors.tint,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  closeText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
