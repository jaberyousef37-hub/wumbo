import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { AppColors, Colors } from '@/constants/theme';
import { CARD_GAP, SECTION_GAP, Spacing } from '@/constants/spacing';
import { ICON_SIZE_CARD } from '@/constants/typography';

type GameCategory = 'all' | 'friends' | 'private';

const OPEN_ROOMS = [
  {
    id: 'r1',
    game: 'UNO',
    gameId: 'uno',
    code: '4832',
    players: 3,
    maxPlayers: 6,
    friends: true,
    isPrivate: false,
    hostName: 'Alex J.',
    hostInitials: 'AJ',
  },
  {
    id: 'r2',
    game: 'BS',
    gameId: 'bs',
    code: '9174',
    players: 4,
    maxPlayers: 6,
    friends: false,
    isPrivate: true,
    hostName: 'Sam K.',
    hostInitials: 'SK',
  },
  {
    id: 'r3',
    game: 'Chess',
    gameId: 'chess',
    code: '1209',
    players: 1,
    maxPlayers: 2,
    friends: true,
    isPrivate: true,
    hostName: 'Jordan M.',
    hostInitials: 'JM',
  },
  {
    id: 'r4',
    game: 'Tic Tac Toe',
    gameId: 'tictactoe',
    code: '5521',
    players: 2,
    maxPlayers: 2,
    friends: false,
    isPrivate: false,
    hostName: 'Riley P.',
    hostInitials: 'RP',
  },
  {
    id: 'r5',
    game: 'Trivia',
    gameId: 'trivia',
    code: '8890',
    players: 5,
    maxPlayers: 8,
    friends: true,
    isPrivate: false,
    hostName: 'Casey L.',
    hostInitials: 'CL',
  },
];

const PLAYERS_ONLINE = 127;

const CATEGORIES: { id: GameCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'friends', label: 'Friends' },
  { id: 'private', label: 'Private' },
];

function PulsingDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.4, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
      true
    );
  }, [opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.pulsingDot, animatedStyle]} />;
}

function filterRooms(rooms: typeof OPEN_ROOMS, category: GameCategory) {
  if (category === 'all') return rooms;
  if (category === 'friends') return rooms.filter((r) => r.friends);
  return rooms.filter((r) => r.isPrivate);
}

const palette = Colors.dark;
const ACCENT = AppColors.tint;

export default function RoomsScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<GameCategory>('all');
  const filteredRooms = filterRooms(OPEN_ROOMS, category);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
        <View
          style={[
            styles.hero,
            {
              backgroundColor: palette.card,
              borderBottomWidth: 1,
              borderBottomColor: palette.cardBorder,
            },
          ]}
        >
          <ThemedText type="title" style={styles.heroTitle}>
            Active rooms
          </ThemedText>
          <ThemedText type="body" style={styles.heroSubtitle}>
            Open lobbies with space — join in one tap.
          </ThemedText>
          <View style={styles.playersBadge}>
            <PulsingDot />
            <ThemedText type="caption" style={styles.playersText}>
              {PLAYERS_ONLINE} online
            </ThemedText>
          </View>
        </View>

        <View style={styles.segmentOuter}>
          <View style={[styles.segment, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  style={[styles.segmentItem, active && { backgroundColor: ACCENT }]}
                >
                  <ThemedText
                    type="caption"
                    style={[styles.segmentLabel, active && { color: '#fff', fontWeight: '700' }]}
                  >
                    {cat.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="section" style={styles.listTitle}>
            Playing now
          </ThemedText>
          {filteredRooms.map((room) => (
            <View
              key={room.id}
              style={[styles.roomCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
            >
              <View style={styles.roomRow}>
                <View style={styles.roomMain}>
                  <ThemedText type="section" numberOfLines={1}>
                    {room.game}
                  </ThemedText>
                  <View style={styles.capacityRow}>
                    <ThemedText type="title" style={styles.capacityNums}>
                      {room.players}/{room.maxPlayers}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: AppColors.muted }}>
                      players
                    </ThemedText>
                  </View>
                  <View style={styles.hostRow}>
                    <Avatar initials={room.hostInitials} size="small" />
                    <ThemedText type="caption" style={{ color: AppColors.muted }} numberOfLines={1}>
                      Host · {room.hostName}
                    </ThemedText>
                  </View>
                  <View style={styles.codeRow}>
                    <ThemedText type="caption" style={{ color: AppColors.muted }}>
                      Code{' '}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: AppColors.text, fontWeight: '700' }}>
                      {room.code}
                    </ThemedText>
                  </View>
                </View>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/play/join-room',
                      params: { code: room.code },
                    })
                  }
                  style={({ pressed }) => [
                    styles.joinBtn,
                    { backgroundColor: ACCENT },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <ThemedText type="caption" style={styles.joinBtnText}>
                    Join
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ))}

          <Pressable
            onPress={() => router.push('/(tabs)/play/create-room')}
            style={({ pressed }) => [styles.createSmall, pressed && { opacity: 0.85 }]}
          >
            <MaterialIcons name="add-circle-outline" size={ICON_SIZE_CARD} color={ACCENT} />
            <ThemedText type="caption" style={{ color: ACCENT, fontWeight: '600' }}>
              Create room
            </ThemedText>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  hero: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: SECTION_GAP / 2,
    justifyContent: 'center',
  },
  heroTitle: { marginBottom: Spacing.xs, fontWeight: '800' },
  heroSubtitle: { color: AppColors.muted, marginBottom: Spacing.sm },
  playersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: 12,
    gap: Spacing.xs,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.success,
  },
  playersText: { fontWeight: '700', color: AppColors.text },
  segmentOuter: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.xs,
    gap: Spacing.xs,
  },
  segmentItem: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: { color: AppColors.muted },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: CARD_GAP,
  },
  listTitle: { marginBottom: 4, fontWeight: '700' },
  roomCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  roomMain: { flex: 1, minWidth: 0, gap: Spacing.xs },
  capacityRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  capacityNums: { fontWeight: '800', color: AppColors.tint },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  codeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  joinBtn: {
    height: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
  },
  joinBtnText: { color: '#fff', fontWeight: '800' },
  createSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
});
