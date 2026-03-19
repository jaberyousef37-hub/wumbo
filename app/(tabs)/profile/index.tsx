import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BaseCard } from '@/components/base-card';
import { ThemedText } from '@/components/themed-text';
import { useProfile } from '@/contexts/profile-context';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';

const LEADERBOARD = [
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

const STATS = { gamesPlayed: 42, wins: 28 };
const XP = { current: 720, nextLevel: 1000 };
const LEVEL = 5;

const FAVORITE_GAMES = [
  { id: '1', name: 'Tic Tac Toe', emoji: '⭕' },
  { id: '2', name: 'UNO', emoji: '🃏' },
  { id: '3', name: 'Chess', emoji: '♟️' },
];

const BADGES = [
  { id: '1', name: 'Chess Master', emoji: '♟️', earned: true },
  { id: '2', name: 'UNO King', emoji: '🃏', earned: true },
  { id: '3', name: 'Tic Tac Champion', emoji: '⭕', earned: true },
  { id: '4', name: 'Trivia Genius', emoji: '❓', earned: false },
];

const SETTINGS = [
  { id: 'edit', label: 'Edit Profile', icon: 'edit' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  { id: 'privacy', label: 'Privacy', icon: 'lock' },
  { id: 'logout', label: 'Logout', icon: 'logout' },
];

export default function ProfileScreen() {
  const { name: profileName, username: profileUsername } = useProfile();
  const { isDark, toggleTheme } = useTheme();
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);

  const displayName = profileName || 'Alex Chen';
  const displayUsername = profileUsername || '@alexchen';
  const palette = isDark ? Colors.dark : Colors.light;

  const winRate =
    STATS.gamesPlayed > 0 ? Math.round((STATS.wins / STATS.gamesPlayed) * 100) : 0;
  const xpProgress = Math.min(1, XP.current / XP.nextLevel);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfilePhotoUri(result.assets[0].uri);
    }
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.animatedWrap}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* FOCAL: Avatar + Level 2x bigger */}
          <Pressable onPress={pickImage} style={styles.avatarWrap}>
            <View style={styles.avatarOuter}>
              <Avatar initials={displayName} imageUri={profilePhotoUri} size="xlarge" />
            </View>
            <View style={[styles.editAvatarBtn, { backgroundColor: palette.tint }]}>
              <MaterialIcons name="edit" size={20} color="#fff" />
            </View>
          </Pressable>

          <ThemedText type="title" style={styles.name}>
            {displayName}
          </ThemedText>
          <ThemedText
            style={styles.username}
            lightColor={Colors.light.icon}
            darkColor={Colors.dark.icon}
          >
            {displayUsername}
          </ThemedText>

          {/* Level — prominent, 2x scale */}
          <View style={[styles.levelCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <ThemedText style={styles.levelValue}>Level {LEVEL}</ThemedText>
            <View style={[styles.xpTrack, { backgroundColor: palette.cardBorder }]}>
              <View
                style={[
                  styles.xpFill,
                  { width: `${xpProgress * 100}%`, backgroundColor: palette.tint },
                ]}
              />
            </View>
            <ThemedText
              style={styles.xpText}
              lightColor={Colors.light.icon}
              darkColor={Colors.dark.icon}
            >
              {XP.current} / {XP.nextLevel} XP
            </ThemedText>
          </View>

          {/* Stats — flat cards */}
          <View style={styles.statsRow}>
            <View style={styles.statCardWrap}>
              <BaseCard>
                <View style={styles.statContent}>
                  <ThemedText style={styles.statValue}>{STATS.gamesPlayed}</ThemedText>
                  <ThemedText
                    style={styles.statLabel}
                    lightColor={Colors.light.icon}
                    darkColor={Colors.dark.icon}
                  >
                    Games
                  </ThemedText>
                </View>
              </BaseCard>
            </View>
            <View style={styles.statCardWrap}>
              <BaseCard>
                <View style={styles.statContent}>
                  <ThemedText style={styles.statValue}>{STATS.wins}</ThemedText>
                  <ThemedText
                    style={styles.statLabel}
                    lightColor={Colors.light.icon}
                    darkColor={Colors.dark.icon}
                  >
                    Wins
                  </ThemedText>
                </View>
              </BaseCard>
            </View>
            <View style={styles.statCardWrap}>
              <BaseCard>
                <View style={styles.statContent}>
                  <ThemedText style={styles.statValue}>{winRate}%</ThemedText>
                  <ThemedText
                    style={styles.statLabel}
                    lightColor={Colors.light.icon}
                    darkColor={Colors.dark.icon}
                  >
                    Win Rate
                  </ThemedText>
                </View>
              </BaseCard>
            </View>
          </View>

          {/* Leaderboard */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Leaderboard
            </ThemedText>
            {LEADERBOARD.map((player) => {
              const wr =
                player.gamesPlayed > 0
                  ? Math.round((player.wins / player.gamesPlayed) * 100)
                  : 0;
              return (
                <BaseCard key={player.rank} showChevron onPress={() => {}}>
                  <View style={styles.leaderboardRow}>
                    <Avatar initials={player.avatar} size="small" />
                    <View style={styles.leaderboardInfo}>
                      <ThemedText style={styles.leaderboardName}>{player.name}</ThemedText>
                      <ThemedText
                        style={styles.leaderboardStats}
                        lightColor={Colors.light.icon}
                        darkColor={Colors.dark.icon}
                      >
                        {player.wins} wins · {wr}% win rate
                      </ThemedText>
                    </View>
                  </View>
                </BaseCard>
              );
            })}
          </View>

          {/* Badges */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Badges
            </ThemedText>
            <View style={styles.badgesGrid}>
              {BADGES.map((badge) => (
                <BaseCard key={badge.id} style={[styles.badgeCard, !badge.earned ? styles.badgeLocked : undefined]}>
                  <View style={styles.badgeContent}>
                    <ThemedText style={styles.badgeEmoji}>{badge.emoji}</ThemedText>
                    <ThemedText
                      style={[styles.badgeName, !badge.earned && styles.badgeNameLocked]}
                      numberOfLines={1}
                    >
                      {badge.name}
                    </ThemedText>
                  </View>
                </BaseCard>
              ))}
            </View>
          </View>

          {/* Favorite games */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Favorite Games
            </ThemedText>
            {FAVORITE_GAMES.map((game) => (
              <BaseCard key={game.id} showChevron onPress={() => {}}>
                <View style={styles.gameRow}>
                  <ThemedText style={styles.gameEmoji}>{game.emoji}</ThemedText>
                  <ThemedText style={styles.gameName}>{game.name}</ThemedText>
                </View>
              </BaseCard>
            ))}
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Settings
            </ThemedText>
            <View style={styles.settingsList}>
              <View style={[styles.settingsRow, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
                <MaterialIcons name="light-mode" size={24} color={palette.icon} />
                <ThemedText style={styles.settingsLabel}>Light theme</ThemedText>
                <Switch
                value={!isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: palette.cardBorder, true: palette.tint }}
                thumbColor="#fff"
              />
              </View>
            {SETTINGS.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.settingsRow,
                  { backgroundColor: palette.card, borderColor: palette.cardBorder },
                  pressed && styles.pressed,
                ]}
              >
                <MaterialIcons name={item.icon as any} size={24} color={palette.icon} />
                <ThemedText style={styles.settingsLabel}>{item.label}</ThemedText>
                <MaterialIcons name="chevron-right" size={24} color={palette.icon} />
              </Pressable>
            ))}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  animatedWrap: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  avatarWrap: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    position: 'relative',
  },
  avatarOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'transparent',
  },
  avatarImage: { width: '100%', height: '100%' },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { marginBottom: Spacing.xs },
  username: { fontSize: 15, marginBottom: Spacing.sm },
  levelCard: {
    width: '100%',
    padding: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  levelValue: { fontSize: 24, fontWeight: '800', marginBottom: Spacing.xs },
  xpTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  xpFill: { height: '100%', borderRadius: 4 },
  xpText: { fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    width: '100%',
    marginBottom: Spacing.md,
  },
  statCardWrap: { flex: 1 },
  statContent: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', marginBottom: Spacing.xs },
  statLabel: { fontSize: 12 },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  section: { width: '100%', marginBottom: Spacing.md },
  sectionTitle: { fontSize: 16, marginBottom: Spacing.sm },
  leaderboardInfo: { flex: 1, marginLeft: Spacing.sm, justifyContent: 'center' },
  leaderboardName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  leaderboardStats: { fontSize: 13 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  badgeCard: { flex: 1, minWidth: 90 },
  badgeLocked: { opacity: 0.5 },
  badgeContent: { alignItems: 'center' },
  badgeEmoji: { fontSize: 24, marginBottom: Spacing.xs },
  badgeName: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  badgeNameLocked: { opacity: 0.7 },
  gameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  gameEmoji: { fontSize: 24, marginRight: Spacing.sm },
  gameName: { fontSize: 16 },
  settingsList: { gap: Spacing.xs },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
  },
  settingsLabel: { flex: 1, marginLeft: Spacing.sm, fontSize: 16 },
  pressed: { opacity: 0.9 },
});
