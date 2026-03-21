import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BaseCard } from '@/components/base-card';
import { ThemedText } from '@/components/themed-text';
import { useProfile } from '@/contexts/profile-context';
import { AppColors, Colors } from '@/constants/theme';
import { CARD_GAP, SECTION_GAP, Spacing } from '@/constants/spacing';
import { ICON_SIZE_CARD } from '@/constants/typography';

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
  { id: 'edit', label: 'Edit Profile', icon: 'edit' as const },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' as const },
  { id: 'privacy', label: 'Privacy', icon: 'lock' as const },
  { id: 'logout', label: 'Logout', icon: 'logout' as const },
];

const palette = Colors.dark;

export default function ProfileScreen() {
  const router = useRouter();
  const { name: profileName, username: profileUsername } = useProfile();
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);

  const displayName = profileName || 'Yousef';
  const displayUsername = profileUsername || '@yousef';
  const displayInitials =
    displayName === 'Yousef'
      ? 'YJ'
      : displayName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || '??';

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
          <Pressable onPress={pickImage} style={styles.avatarWrap}>
            <View style={styles.avatarOuter}>
              <Avatar initials={displayInitials} imageUri={profilePhotoUri} size="xlarge" />
            </View>
            <View style={[styles.editAvatarBtn, { backgroundColor: palette.tint }]}>
              <MaterialIcons name="edit" size={ICON_SIZE_CARD} color="#fff" />
            </View>
          </Pressable>

          <ThemedText type="title" style={styles.name}>
            {displayName}
          </ThemedText>
          <ThemedText type="body" style={[styles.username, { color: AppColors.muted }]}>
            {displayUsername}
          </ThemedText>

          <View
            style={[
              styles.levelCard,
              { backgroundColor: palette.card, borderColor: palette.cardBorder },
            ]}
          >
            <ThemedText type="section" style={styles.levelLabel}>
              Level {LEVEL}
            </ThemedText>
            <View style={[styles.xpTrack, { backgroundColor: palette.cardBorder }]}>
              <View
                style={[
                  styles.xpFill,
                  { width: `${xpProgress * 100}%`, backgroundColor: palette.tint },
                ]}
              />
            </View>
            <ThemedText type="caption" style={{ color: AppColors.muted }}>
              {XP.current} / {XP.nextLevel} XP
            </ThemedText>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCardWrap}>
              <BaseCard>
                <View style={styles.statContent}>
                  <ThemedText type="section" style={styles.statValue}>
                    {STATS.gamesPlayed}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: AppColors.muted }}>
                    Games
                  </ThemedText>
                </View>
              </BaseCard>
            </View>
            <View style={styles.statCardWrap}>
              <BaseCard>
                <View style={styles.statContent}>
                  <ThemedText type="section" style={styles.statValue}>
                    {STATS.wins}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: AppColors.muted }}>
                    Wins
                  </ThemedText>
                </View>
              </BaseCard>
            </View>
            <View style={styles.statCardWrap}>
              <BaseCard>
                <View style={styles.statContent}>
                  <ThemedText type="section" style={styles.statValue}>
                    {winRate}%
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: AppColors.muted }}>
                    Win rate
                  </ThemedText>
                </View>
              </BaseCard>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/(tabs)/profile/leaderboard')}
            style={({ pressed }) => [
              styles.leaderboardRow,
              { backgroundColor: palette.card, borderColor: palette.cardBorder },
              pressed && { opacity: 0.9 },
            ]}
          >
            <MaterialIcons name="leaderboard" size={ICON_SIZE_CARD} color={palette.tint} />
            <ThemedText type="section" style={styles.leaderboardRowText}>
              Leaderboard
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: AppColors.muted, flex: 1 }}
              numberOfLines={1}
            >
              Top players
            </ThemedText>
            <MaterialIcons name="chevron-right" size={ICON_SIZE_CARD} color={AppColors.muted} />
          </Pressable>

          <View style={styles.section}>
            <ThemedText type="section" style={styles.sectionTitle}>
              Badges
            </ThemedText>
            <View style={styles.badgesGrid}>
              {BADGES.map((badge) => (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeCell,
                    {
                      backgroundColor: palette.card,
                      borderColor: badge.earned ? palette.cardBorder : AppColors.border,
                    },
                    !badge.earned && styles.badgeLockedCell,
                  ]}
                >
                  {!badge.earned && (
                    <View style={styles.lockCorner}>
                      <MaterialIcons name="lock" size={ICON_SIZE_CARD} color={AppColors.muted} />
                    </View>
                  )}
                  <ThemedText
                    style={[styles.badgeEmoji, !badge.earned && { opacity: 0.35 }]}
                  >
                    {badge.emoji}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={[
                      styles.badgeName,
                      !badge.earned && { color: AppColors.muted },
                    ]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    {badge.name}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="section" style={styles.sectionTitle}>
              Favorite games
            </ThemedText>
            <View style={{ gap: CARD_GAP }}>
              {FAVORITE_GAMES.map((game) => (
                <BaseCard key={game.id} showChevron onPress={() => {}}>
                  <View style={styles.gameRow}>
                    <ThemedText style={styles.gameEmoji}>{game.emoji}</ThemedText>
                    <ThemedText type="body">{game.name}</ThemedText>
                  </View>
                </BaseCard>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="section" style={styles.sectionTitle}>
              Settings
            </ThemedText>
            <View style={styles.settingsList}>
              {SETTINGS.map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.settingsRow,
                    { backgroundColor: palette.card, borderColor: palette.cardBorder },
                    pressed && styles.pressed,
                  ]}
                >
                  <MaterialIcons name={item.icon} size={ICON_SIZE_CARD} color={palette.icon} />
                  <ThemedText type="body" style={styles.settingsLabel}>
                    {item.label}
                  </ThemedText>
                  <MaterialIcons name="chevron-right" size={ICON_SIZE_CARD} color={AppColors.muted} />
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
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    gap: SECTION_GAP,
  },
  avatarWrap: {
    marginTop: Spacing.sm,
    position: 'relative',
  },
  avatarOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: AppColors.border,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { marginBottom: Spacing.xs },
  username: { marginBottom: 0 },
  levelCard: {
    width: '100%',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  levelLabel: { marginBottom: Spacing.xs },
  xpTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  xpFill: { height: '100%', borderRadius: 3 },
  statsRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    width: '100%',
  },
  statCardWrap: { flex: 1 },
  statContent: { alignItems: 'center' },
  statValue: { marginBottom: Spacing.xs },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  leaderboardRowText: { fontWeight: '700' },
  section: { width: '100%', gap: Spacing.sm },
  sectionTitle: {},
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  badgeCell: {
    width: '47%',
    minWidth: '44%',
    flexGrow: 1,
    padding: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 96,
    justifyContent: 'center',
    position: 'relative',
  },
  badgeLockedCell: {
    backgroundColor: '#141414',
  },
  lockCorner: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
  },
  badgeEmoji: { fontSize: 22, marginBottom: Spacing.xs },
  badgeName: {
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  gameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.sm },
  gameEmoji: { fontSize: 22 },
  settingsList: { gap: CARD_GAP },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48,
  },
  settingsLabel: { flex: 1, marginLeft: Spacing.sm },
  pressed: { opacity: 0.9 },
});
