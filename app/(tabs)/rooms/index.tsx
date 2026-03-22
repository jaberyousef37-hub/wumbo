import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { AppColors } from '@/constants/theme';
import { CARD_GAP, SECTION_GAP, Spacing } from '@/constants/spacing';

const BG = AppColors.background;
const ACCENT = AppColors.tint;

type GameIconName = keyof typeof MaterialIcons.glyphMap;

type RoomRow = {
  id: string;
  game: string;
  gameId: string;
  gameIcon: GameIconName;
  code: string;
  players: number;
  maxPlayers: number;
  friends: boolean;
  isPrivate: boolean;
  hostName: string;
  hostInitials: string;
};

const OPEN_ROOMS: RoomRow[] = [
  {
    id: 'r1',
    game: 'UNO',
    gameId: 'uno',
    gameIcon: 'style',
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
    gameIcon: 'casino',
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
    gameIcon: 'emoji-events',
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
    gameIcon: 'grid-3x3',
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
    gameIcon: 'quiz',
    code: '8890',
    players: 5,
    maxPlayers: 8,
    friends: true,
    isPrivate: false,
    hostName: 'Casey L.',
    hostInitials: 'CL',
  },
];

const LIVE_PLAYER_COUNT = 127;

type RoomFilter = 'all' | 'active' | 'friends';

const FILTERS: { id: RoomFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'friends', label: 'Friends' },
];

function PulsingDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.35, { duration: 650 }), withTiming(1, { duration: 650 })),
      -1,
      true,
    );
  }, [opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.pulsingDot, animatedStyle]} />;
}

function filterRooms(rooms: RoomRow[], f: RoomFilter): RoomRow[] {
  if (f === 'all') return rooms;
  if (f === 'friends') return rooms.filter((r) => r.friends);
  return rooms.filter((r) => r.players < r.maxPlayers);
}

export default function RoomsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<RoomFilter>('all');
  const filteredRooms = useMemo(() => filterRooms(OPEN_ROOMS, filter), [filter]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
        <View style={styles.liveRow}>
          <PulsingDot />
          <Text style={styles.liveText}>
            <Text style={styles.liveBold}>{LIVE_PLAYER_COUNT.toLocaleString()}</Text> players live
          </Text>
        </View>

        <View style={styles.filterBar}>
          {FILTERS.map((item) => {
            const on = filter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setFilter(item.id)}
                style={[styles.filterChip, on && styles.filterChipOn]}
              >
                <Text style={[styles.filterChipText, on && styles.filterChipTextOn]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredRooms.length === 0 ? (
            <View style={styles.empty}>
              <MaterialIcons name="groups" size={48} color={AppColors.muted} />
              <Text style={styles.emptyTitle}>No active rooms — be the first!</Text>
              <ThemedText type="caption" style={styles.emptySub}>
                Host a game and share the code with friends.
              </ThemedText>
            </View>
          ) : (
            filteredRooms.map((room) => {
              const pct = Math.min(100, (room.players / room.maxPlayers) * 100);
              return (
                <View key={room.id} style={styles.roomCard}>
                  <View style={styles.roomTop}>
                    <View style={styles.gameIconWrap}>
                      <MaterialIcons name={room.gameIcon} size={28} color={ACCENT} />
                    </View>
                    <View style={styles.roomHeadText}>
                      <Text style={styles.gameTitle}>{room.game}</Text>
                      <View style={styles.hostRow}>
                        <Avatar initials={room.hostInitials} size="small" />
                        <Text style={styles.hostName} numberOfLines={1}>
                          {room.hostName}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/play/join-room',
                          params: { code: room.code },
                        })
                      }
                      style={({ pressed }) => [styles.joinBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.joinBtnText}>Join</Text>
                    </Pressable>
                  </View>

                  <View style={styles.progressBlock}>
                    <View style={styles.progressLabels}>
                      <Text style={styles.progressLabel}>Players</Text>
                      <Text style={styles.progressNums}>
                        {room.players}/{room.maxPlayers}
                      </Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${pct}%` }]} />
                    </View>
                  </View>

                  <View style={styles.codeRow}>
                    <Text style={styles.codeMuted}>Room code </Text>
                    <Text style={styles.codeValue}>{room.code}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={() => router.push('/(tabs)/play/create-room')}
            style={({ pressed }) => [styles.createFull, pressed && styles.pressed]}
          >
            <MaterialIcons name="add" size={22} color="#fff" />
            <Text style={styles.createFullText}>Create Room</Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1 },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColors.success,
    shadowColor: AppColors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  liveText: { color: AppColors.muted, fontSize: 15, fontWeight: '600' },
  liveBold: { color: AppColors.text, fontWeight: '800' },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: AppColors.card,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  filterChipOn: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderColor: ACCENT,
  },
  filterChipText: { color: AppColors.muted, fontWeight: '700', fontSize: 14 },
  filterChipTextOn: { color: AppColors.text },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: CARD_GAP,
  },
  roomCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    backgroundColor: AppColors.card,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  roomTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  gameIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  roomHeadText: { flex: 1, minWidth: 0, gap: 6 },
  gameTitle: { color: AppColors.text, fontSize: 17, fontWeight: '800' },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hostName: { color: AppColors.muted, fontSize: 13, fontWeight: '600', flex: 1 },
  joinBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 76,
    alignItems: 'center',
  },
  joinBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  progressBlock: { gap: 6 },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: { color: AppColors.muted, fontSize: 12, fontWeight: '600' },
  progressNums: { color: AppColors.text, fontSize: 13, fontWeight: '800' },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  codeMuted: { color: AppColors.muted, fontSize: 13 },
  codeValue: { color: AppColors.text, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.lg + Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    color: AppColors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  emptySub: { color: AppColors.muted, textAlign: 'center', lineHeight: 20 },
  footer: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.cardBorder,
    backgroundColor: BG,
  },
  createFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
  },
  createFullText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  pressed: { opacity: 0.9 },
});
