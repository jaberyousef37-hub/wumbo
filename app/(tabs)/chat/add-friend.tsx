import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BaseCard } from '@/components/base-card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { useProfile } from '@/contexts/profile-context';
import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import { supabase } from '@/lib/supabase';

type ProfileResult = {
  username: string;
  name: string;
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || '?';
}

/** Deterministic DM room ID for two usernames — same result regardless of call order */
function dmRoomId(a: string, b: string): string {
  return `dm_${[a, b].sort().join('_')}`;
}

export default function AddFriendScreen() {
  const router = useRouter();
  const { username: currentUsername } = useProfile();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();

    if (!trimmed) {
      // Show all profiles except self when no query
      setLoading(true);
      debounceRef.current = setTimeout(async () => {
        const { data } = await supabase
          .from('profiles')
          .select('username, name')
          .neq('username', currentUsername || '')
          .order('created_at', { ascending: false })
          .limit(30);
        setResults(data ?? []);
        setLoading(false);
      }, 0);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, name')
        .or(`username.ilike.%${trimmed}%,name.ilike.%${trimmed}%`)
        .neq('username', currentUsername || '')
        .limit(20);
      setResults(data ?? []);
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, currentUsername]);

  const handleAddFriend = async (targetUsername: string) => {
    setAdding(targetUsername);
    try {
      const me = currentUsername || 'guest';
      // Create friendship record (accepted immediately — no pending flow yet)
      await supabase.from('friends').upsert(
        { sender_id: me, receiver_id: targetUsername, status: 'accepted' },
        { onConflict: 'sender_id,receiver_id' }
      );
      setAdded((prev) => new Set(prev).add(targetUsername));
      // Navigate to DM chat room
      const roomId = dmRoomId(me, targetUsername);
      router.replace(`/(tabs)/chat/${roomId}`);
    } catch (e) {
      console.error('[AddFriend] error:', e);
    }
    setAdding(null);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['bottom', 'left', 'right']}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            Add Friend
          </ThemedText>
        </View>

        <View style={[styles.searchBar, { borderBottomColor: palette.cardBorder }]}>
          <MaterialIcons name="search" size={20} color={palette.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder="Search by name or username..."
            placeholderTextColor={palette.tabIconDefault}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <MaterialIcons name="close" size={18} color={palette.icon} />
            </Pressable>
          )}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText style={[styles.sectionLabel, { color: palette.icon }]}>
            {query.trim() ? 'Search results' : 'People you may know'}
          </ThemedText>

          {loading ? (
            <ActivityIndicator color={palette.tint} style={styles.loader} />
          ) : results.length === 0 ? (
            <ThemedText style={[styles.emptyText, { color: palette.icon }]}>
              {query.trim() ? `No users found for "${query}"` : 'No users found'}
            </ThemedText>
          ) : (
            results.map((user) => (
              <BaseCard key={user.username}>
                <View style={styles.resultRow}>
                  <Avatar initials={initialsFor(user.name)} size="medium" />
                  <View style={styles.resultInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.resultName}>
                      {user.name}
                    </ThemedText>
                    <ThemedText style={[styles.resultUsername, { color: palette.icon }]}>
                      {user.username}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => { void handleAddFriend(user.username); }}
                    disabled={adding === user.username || added.has(user.username)}
                    style={({ pressed }) => [
                      styles.addBtn,
                      { backgroundColor: added.has(user.username) ? palette.cardBorder : palette.tint },
                      pressed && !adding && styles.addBtnPressed,
                      (adding === user.username || added.has(user.username)) && styles.addBtnDisabled,
                    ]}
                  >
                    <ThemedText style={styles.addBtnText}>
                      {adding === user.username ? 'Adding...' : added.has(user.username) ? 'Added' : 'Add'}
                    </ThemedText>
                  </Pressable>
                </View>
              </BaseCard>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backBtn: { marginRight: Spacing.sm },
  title: { fontSize: 20 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  searchIcon: { marginRight: 4 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingBottom: Spacing.lg, gap: Spacing.sm },
  loader: { marginTop: Spacing.lg },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultInfo: { flex: 1, marginLeft: Spacing.sm },
  resultName: { fontSize: 16, marginBottom: 2 },
  resultUsername: { fontSize: 14 },
  addBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: 10,
  },
  addBtnPressed: { opacity: 0.9 },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 15, textAlign: 'center', marginTop: Spacing.lg },
});
