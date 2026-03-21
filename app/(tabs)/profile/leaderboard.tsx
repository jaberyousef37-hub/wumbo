import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BaseCard } from '@/components/base-card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { SCREEN_PADDING } from '@/constants/spacing';

type LeaderboardTab = 'all' | 'week' | 'friends';

const TOP_PLAYERS = [
  { rank: 1, name: 'Luna Star', wins: 156, gamesPlayed: 180, avatar: 'LS' },
  { rank: 2, name: 'Max Power', wins: 142, gamesPlayed: 165, avatar: 'MP' },
  { rank: 3, name: 'Zara Swift', wins: 128, gamesPlayed: 150, avatar: 'ZS' },
  { rank: 4, name: 'Leo Knight', wins: 115, gamesPlayed: 140, avatar: 'LK' },
  { rank: 5, name: 'Aria Bloom', wins: 98, gamesPlayed: 120, avatar: 'AB' },
  { rank: 6, name: 'Finn River', wins: 87, gamesPlayed: 110, avatar: 'FR' },
  { rank: 7, name: 'Maya Storm', wins: 76, gamesPlayed: 95, avatar: 'MS' },
  { rank: 8, name: 'Kai Phoenix', wins: 65, gamesPlayed: 85, avatar: 'KP' },
  { rank: 9, name: 'Nova Sky', wins: 54, gamesPlayed: 72, avatar: 'NS' },
  { rank: 10, name: 'Echo Wave', wins: 42, gamesPlayed: 58, avatar: 'EW' },
];

const MY_STATS = { rank: 42, name: 'Yousef', wins: 28, gamesPlayed: 42, avatar: 'YJ' };

function RankCrown({ rank }: { rank: number }) {
  if (rank === 1) return <MaterialIcons name="workspace-premium" size={28} color="#FFD700" />;
  if (rank === 2) return <MaterialIcons name="workspace-premium" size={28} color="#C0C0C0" />;
  if (rank === 3) return <MaterialIcons name="workspace-premium" size={28} color="#CD7F32" />;
  return (
    <ThemedText style={styles.rankNum} lightColor={Colors.light.icon} darkColor={Colors.dark.icon}>
      #{rank}
    </ThemedText>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<LeaderboardTab>('all');
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  const players = tab === 'friends' ? TOP_PLAYERS.slice(0, 3) : TOP_PLAYERS;
  const winRate = (p: { wins: number; gamesPlayed: number }) =>
    p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            Leaderboard
          </ThemedText>
        </View>

        <View style={[styles.tabRow, { borderColor: palette.cardBorder }]}>
          {(['all', 'week', 'friends'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.tab,
                tab === t && { borderBottomColor: palette.tint, borderBottomWidth: 2 },
              ]}
            >
              <ThemedText
                style={[
                  styles.tabLabel,
                  tab === t && { color: palette.tint, fontWeight: '700' },
                ]}
              >
                {t === 'all' ? 'All Time' : t === 'week' ? 'This Week' : 'Friends'}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {players.map((player, index) => (
            <Animated.View
              key={player.rank}
              entering={FadeInDown.delay(index * 60).springify().damping(16)}
            >
              <BaseCard>
                <View style={styles.playerRow}>
                  <View style={styles.rankWrap}>
                    <RankCrown rank={player.rank} />
                  </View>
                  <View style={styles.avatarWrap}>
                    <Avatar initials={player.avatar} size="medium" />
                  </View>
                  <View style={styles.playerInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.playerName}>
                      {player.name}
                    </ThemedText>
                    <ThemedText
                      style={[styles.playerStats, { color: palette.icon }]}
                    >
                      {player.wins} wins · {winRate(player)}% · {player.gamesPlayed} games
                    </ThemedText>
                  </View>
                </View>
              </BaseCard>
            </Animated.View>
          ))}

          <View style={[styles.myRankWrap, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <View style={styles.playerRow}>
              <View style={styles.rankWrap}>
                <ThemedText style={[styles.rankNum, { color: palette.icon }]}>
                  #{MY_STATS.rank}
                </ThemedText>
              </View>
              <View style={styles.avatarWrap}>
                <Avatar initials={MY_STATS.avatar} size="medium" />
              </View>
              <View style={styles.playerInfo}>
                <ThemedText type="defaultSemiBold" style={styles.playerName}>
                  {MY_STATS.name} (You)
                </ThemedText>
                <ThemedText style={[styles.playerStats, { color: palette.icon }]}>
                  {MY_STATS.wins} wins · {winRate(MY_STATS)}% · {MY_STATS.gamesPlayed} games
                </ThemedText>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: SCREEN_PADDING },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SCREEN_PADDING,
  },
  backBtn: { marginRight: SCREEN_PADDING },
  title: { fontSize: 20 },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: SCREEN_PADDING,
  },
  tab: {
    flex: 1,
    paddingVertical: SCREEN_PADDING,
    marginBottom: -1,
    alignItems: 'center',
  },
  tabLabel: { fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SCREEN_PADDING * 2, gap: SCREEN_PADDING / 2 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankWrap: { width: 40, alignItems: 'center' },
  rankNum: { fontSize: 14, fontWeight: '700' },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SCREEN_PADDING,
  },
  playerInfo: { flex: 1, marginLeft: SCREEN_PADDING },
  playerName: { fontSize: 16, marginBottom: 2 },
  playerStats: { fontSize: 13 },
  myRankWrap: {
    marginTop: SCREEN_PADDING,
    padding: SCREEN_PADDING,
    borderRadius: 12,
    borderWidth: 1,
  },
});
