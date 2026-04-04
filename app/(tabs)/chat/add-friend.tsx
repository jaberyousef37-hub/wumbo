import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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
import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import { supabase } from '@/lib/supabase';
import { FAKE_SEARCH_USERS, CURRENT_USER_ID } from '@/lib/friends-data';

export default function AddFriendScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const results = query.trim()
    ? FAKE_SEARCH_USERS.filter(
        (u) =>
          u.name.toLowerCase().includes(query.toLowerCase()) ||
          u.username.toLowerCase().includes(query.toLowerCase())
      )
    : FAKE_SEARCH_USERS;

  const handleAddFriend = async (userId: string) => {
    setAdding(userId);
    try {
      await supabase.from('friends').insert({
        sender_id: CURRENT_USER_ID,
        receiver_id: userId,
        status: 'pending',
      });
    } catch (e) {
      console.error('[AddFriend] Supabase failed:', e);
    }
    setAdding(null);
    router.back();
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

          {results.length === 0 ? (
            <ThemedText style={[styles.emptyText, { color: palette.icon }]}>
              {`No users found for "${query}"`}
            </ThemedText>
          ) : (
            results.map((user) => (
              <BaseCard key={user.id}>
                <View style={styles.resultRow}>
                  <Avatar initials={user.avatar} size="medium" />
                  <View style={styles.resultInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.resultName}>
                      {user.name}
                    </ThemedText>
                    <ThemedText style={[styles.resultUsername, { color: palette.icon }]}>
                      {user.username}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => handleAddFriend(user.id)}
                    disabled={adding === user.id}
                    style={({ pressed }) => [
                      styles.addBtn,
                      { backgroundColor: palette.tint },
                      pressed && !adding && styles.addBtnPressed,
                      adding === user.id && styles.addBtnDisabled,
                    ]}
                  >
                    <ThemedText style={styles.addBtnText}>
                      {adding === user.id ? 'Adding...' : 'Add'}
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
