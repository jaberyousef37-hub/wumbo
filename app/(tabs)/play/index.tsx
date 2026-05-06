import type { Href } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBar } from '@/components/design-system';
import { ThemedText } from '@/components/themed-text';
import { AppColors } from '@/constants/theme';
import { CARD_GAP, CARD_PADDING, SECTION_GAP, Spacing } from '@/constants/spacing';

const BG = AppColors.background;
const ACCENT = AppColors.tint;
const CARD_DARK = '#1a1a1a';
const CARD_ELEV = '#2a2a2a';

type SectionId = 'card' | 'board' | 'party' | 'solo';

type PlayGame = {
  id: string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  section: SectionId;
  activePlayers: number;
  duration: string;
  subtitle: string;
  route: Href;
  isNew?: boolean;
};

const SECTION_ORDER: SectionId[] = ['card', 'board', 'party', 'solo'];
const SECTION_LABELS: Record<SectionId, string> = {
  card: 'Card Games',
  board: 'Board Games',
  party: 'Party Games',
  solo: 'Solo',
};

const GAMES: PlayGame[] = [
  {
    id: 'bs',
    name: 'BS',
    icon: 'casino',
    section: 'card',
    activePlayers: 812,
    duration: '10–20 min',
    subtitle: 'Bullshit — bluff, call BS, empty your hand.',
    route: '/(tabs)/play/bs' as Href,
    isNew: true,
  },
  {
    id: 'uno',
    name: 'UNO',
    icon: 'style',
    section: 'card',
    activePlayers: 2103,
    duration: '5–15 min',
    subtitle: 'Drop cards, shout UNO, ruin friendships (nicely).',
    route: '/(tabs)/play/uno',
  },
  {
    id: 'chess',
    name: 'Chess',
    icon: 'emoji-events',
    section: 'board',
    activePlayers: 890,
    duration: '15–45 min',
    subtitle: 'Classic strategy — quick matches with friends.',
    route: '/(tabs)/play/chess',
  },
  {
    id: 'tictactoe',
    name: 'Tic Tac Toe',
    icon: 'grid-3x3',
    section: 'board',
    activePlayers: 420,
    duration: '2 min',
    subtitle: 'Three in a row. Perfect while you wait.',
    route: '/(tabs)/play/tictactoe-details',
  },
  {
    id: 'snakes-ladders',
    name: 'Snakes & Ladders',
    icon: 'timeline',
    section: 'board',
    activePlayers: 640,
    duration: '10–20 min',
    subtitle: 'Dice, ladders up, snakes down — race to 100 with friends or CPU.',
    route: '/(tabs)/play/snakes-ladders' as Href,
    isNew: true,
  },
  {
    id: 'trivia',
    name: 'Trivia',
    icon: 'quiz',
    section: 'party',
    activePlayers: 1410,
    duration: '5–10 min',
    subtitle: 'Fast questions — who knows useless facts?',
    route: '/(tabs)/play/trivia',
  },
  {
    id: 'shell',
    name: 'Shell Game',
    icon: 'local-bar',
    section: 'party',
    activePlayers: 156,
    duration: '2 min',
    subtitle: 'Follow the cup — host or guess with a code.',
    route: '/(tabs)/play/shell-game',
    isNew: true,
  },
  {
    id: 'would-you-rather',
    name: 'Would You Rather',
    icon: 'compare-arrows',
    section: 'party',
    activePlayers: 980,
    duration: '5–15 min',
    subtitle: 'Split-screen dilemmas — solo or pass-the-phone with friends.',
    route: '/(tabs)/play/would-you-rather' as Href,
    isNew: true,
  },
  {
    id: 'snake',
    name: 'Snake',
    icon: 'games',
    section: 'solo',
    activePlayers: 3201,
    duration: 'Endless',
    subtitle: 'Solo high-score chase.',
    route: '/(tabs)/play/snake',
    isNew: true,
  },
];

function GameCard({
  game,
  animDelay,
}: {
  game: PlayGame;
  animDelay: number;
}) {
  const router = useRouter();

  return (
    <Animated.View entering={FadeInDown.delay(animDelay).springify().damping(17)}>
      <View style={styles.gameCard}>
        <View style={styles.cardTopRow}>
          <View style={styles.iconWrap}>
            <MaterialIcons name={game.icon} size={60} color={ACCENT} />
          </View>
          <View style={styles.cardTitleCol}>
            <View style={styles.nameRow}>
              <Text style={styles.gameName}>{game.name}</Text>
              {game.isNew && (
                <LinearGradient
                  colors={['#7C3AED', '#FF6FD8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.newBadge}
                >
                  <Text style={styles.newBadgeText}>New</Text>
                </LinearGradient>
              )}
            </View>
            <Text style={styles.metaLine}>
              {game.activePlayers.toLocaleString()} playing · {game.duration}
            </Text>
            <ThemedText type="body" style={styles.subtitle} numberOfLines={2}>
              {game.subtitle}
            </ThemedText>
          </View>
        </View>
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => router.push(game.route)}
            style={({ pressed }) => [styles.btnSolo, pressed && styles.pressed]}
          >
            <Text style={styles.btnSoloText}>Solo</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/play/create-room' as Href)}
            style={({ pressed }) => [styles.btnMultiWrap, pressed && styles.pressed]}
          >
            <LinearGradient
              colors={[ACCENT, '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnMultiGrad}
            >
              <Text style={styles.btnMultiText}>Multiplayer</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

export default function PlayScreen() {
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GAMES;
    return GAMES.filter(
      (g) => g.name.toLowerCase().includes(q) || g.subtitle.toLowerCase().includes(q),
    );
  }, [query]);

  const sections = useMemo(() => {
    const map = new Map<SectionId, PlayGame[]>();
    for (const id of SECTION_ORDER) map.set(id, []);
    for (const g of filtered) map.get(g.section)!.push(g);
    return SECTION_ORDER.map((id) => ({ id, label: SECTION_LABELS[id], games: map.get(id)! })).filter(
      (s) => s.games.length > 0,
    );
  }, [filtered]);

  const sectionsAnimated = useMemo(() => {
    let d = 100;
    return sections.map((s) => {
      const headerDelay = d;
      d += 55;
      const games = s.games.map((game) => {
        const delay = d;
        d += 48;
        return { game, delay };
      });
      return { id: s.id, label: s.label, headerDelay, games };
    });
  }, [sections]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Animated.View entering={FadeIn.duration(380)} style={styles.container}>
        <HeaderBar title="Play" />
        <ThemedText type="caption" style={styles.headerSub}>
          Solo practice or host a room — your call.
        </ThemedText>

        <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
          <MaterialIcons
            name="search"
            size={22}
            color={searchFocused ? '#7C3AED' : AppColors.muted}
            style={styles.searchIcon}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search games"
            placeholderTextColor={AppColors.muted}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {sections.length === 0 ? (
            <View style={styles.emptySearch}>
              <Text style={styles.emptySearchText}>No games match “{query}”</Text>
            </View>
          ) : (
            sectionsAnimated.map((section) => (
              <View key={section.id} style={styles.sectionBlock}>
                <Animated.View entering={FadeInDown.delay(section.headerDelay).springify().damping(18)}>
                  <Text style={styles.sectionTitle}>{section.label}</Text>
                </Animated.View>
                <View style={styles.sectionCards}>
                  {section.games.map(({ game, delay }) => (
                    <GameCard key={game.id} game={game} animDelay={delay} />
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1 },
  headerSub: {
    color: AppColors.muted,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    backgroundColor: AppColors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: AppColors.cardBorder,
    paddingHorizontal: Spacing.sm,
  },
  searchWrapFocused: {
    borderColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    color: AppColors.text,
    fontSize: 16,
    paddingVertical: 12,
    fontWeight: '500',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: 100,
    gap: SECTION_GAP,
  },
  sectionBlock: { gap: Spacing.sm },
  sectionTitle: {
    color: AppColors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionCards: { gap: CARD_GAP },
  gameCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: CARD_DARK,
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: CARD_PADDING,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: CARD_ELEV,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardTitleCol: { flex: 1, minWidth: 0 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  gameName: { color: AppColors.text, fontSize: 20, fontWeight: '800' },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  newBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  metaLine: { color: AppColors.muted, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  subtitle: { color: AppColors.muted, lineHeight: 20 },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  btnSolo: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'transparent',
  },
  btnSoloText: { color: ACCENT, fontWeight: '800', fontSize: 15 },
  btnMultiWrap: { flex: 1, overflow: 'hidden' },
  btnMultiGrad: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnMultiText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  pressed: { opacity: 0.9 },
  emptySearch: { paddingVertical: Spacing.lg + Spacing.md, alignItems: 'center' },
  emptySearchText: { color: AppColors.muted, fontSize: 16, fontWeight: '600' },
});
