import type { Href } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppColors, Colors } from '@/constants/theme';
import { CARD_GAP, CARD_PADDING, SECTION_GAP, Spacing } from '@/constants/spacing';
import { ICON_SIZE_CARD } from '@/constants/typography';

const ACCENT = '#7C3AED';

type GameItem = {
  id: string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  meta: string;
  subtitle: string;
  route: Href;
};

const GAMES: GameItem[] = [
  {
    id: '1',
    name: 'Chess',
    icon: 'emoji-events',
    meta: '2 players • 15–45 min',
    subtitle: 'Classic strategy — quick matches with friends.',
    route: '/(tabs)/play/chess',
  },
  {
    id: '2',
    name: 'UNO',
    icon: 'style',
    meta: '2–6 players • 5–15 min',
    subtitle: 'Drop cards, shout UNO, ruin friendships (nicely).',
    route: '/(tabs)/play/uno',
  },
  {
    id: '3',
    name: 'Trivia',
    icon: 'quiz',
    meta: '2–8 players • 5–10 min',
    subtitle: 'Fast questions — who knows useless facts?',
    route: '/(tabs)/play/trivia',
  },
  {
    id: '4',
    name: 'Tic Tac Toe',
    icon: 'grid-3x3',
    meta: '2 players • 2 min',
    subtitle: 'Three in a row. Perfect while you wait.',
    route: '/(tabs)/play/tictactoe-details',
  },
  {
    id: '5',
    name: 'Snake',
    icon: 'games',
    meta: '1 player • endless',
    subtitle: 'Solo high-score chase.',
    route: '/(tabs)/play/snake',
  },
  {
    id: '6',
    name: 'Shell Game',
    icon: 'local-bar',
    meta: '2 players • 2 min',
    subtitle: 'Follow the cup — host or guess with a code.',
    route: '/(tabs)/play/shell-game',
  },
];

const palette = Colors.dark;

function GameCard({ game, index }: { game: GameItem; index: number }) {
  const router = useRouter();

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify().damping(16)}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: palette.card,
            borderColor: palette.cardBorder,
          },
        ]}
      >
        <Pressable
          onPress={() => router.push(game.route)}
          style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}
        >
          <View style={styles.cardTop}>
            <View style={[styles.iconWrap, { borderColor: `${ACCENT}55` }]}>
              <MaterialIcons name={game.icon} size={ICON_SIZE_CARD} color={ACCENT} />
            </View>
          </View>
          <ThemedText type="section" style={styles.gameName}>
            {game.name}
          </ThemedText>
          <ThemedText type="caption" style={[styles.meta, { color: AppColors.muted }]}>
            {game.meta}
          </ThemedText>
          <ThemedText type="body" style={{ color: AppColors.muted }} numberOfLines={2}>
            {game.subtitle}
          </ThemedText>
        </Pressable>
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => router.push(game.route)}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionSolo,
              {
                borderColor: ACCENT,
                backgroundColor: 'transparent',
              },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="caption" style={[styles.actionLabel, { color: ACCENT }]}>
              Play solo
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/play/create-room' as Href)}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionInvite,
              { backgroundColor: ACCENT },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="caption" style={[styles.actionLabel, { color: '#fff' }]}>
              Host & invite
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

export default function PlayScreen() {
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            Play
          </ThemedText>
          <ThemedText type="body" style={{ color: AppColors.muted }}>
            Party games in your pocket — like Game Pigeon, with a Wumbo twist. Go solo or host a room and
            ping friends from Chat.
          </ThemedText>
        </View>

        <FlatList
          data={GAMES}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <GameCard game={item} index={index} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
    paddingBottom: SECTION_GAP / 2,
    gap: Spacing.xs,
  },
  headerTitle: { fontWeight: '800' },
  listContent: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: CARD_GAP,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardMain: {
    padding: CARD_PADDING,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  meta: { marginBottom: Spacing.xs, fontWeight: '600' },
  gameName: { marginBottom: 4 },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSolo: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  actionInvite: {},
  actionLabel: { fontWeight: '700' },
  pressed: { opacity: 0.92 },
});
