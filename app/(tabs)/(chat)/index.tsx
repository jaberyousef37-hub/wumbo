import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

type Conversation = {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  participants: string[];
};

const CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    name: 'Game Night Crew',
    isGroup: true,
    lastMessage: 'Alex: See you at the game night!',
    timestamp: '2m ago',
    unreadCount: 3,
    participants: ['Alex', 'Jordan', 'Sam', 'Riley'],
  },
  {
    id: '2',
    name: 'Alex',
    isGroup: false,
    lastMessage: 'That movie was amazing',
    timestamp: '1h ago',
    unreadCount: 0,
    participants: ['Alex'],
  },
  {
    id: '3',
    name: 'Wumbo Gamers',
    isGroup: true,
    lastMessage: 'Sam: Who\'s down for a round?',
    timestamp: '5m ago',
    unreadCount: 12,
    participants: ['Sam', 'Riley', 'Jordan'],
  },
  {
    id: '4',
    name: 'Jordan',
    isGroup: false,
    lastMessage: 'Let\'s catch up later tonight',
    timestamp: 'Yesterday',
    unreadCount: 1,
    participants: ['Jordan'],
  },
  {
    id: '5',
    name: 'Design Squad',
    isGroup: true,
    lastMessage: 'Riley: Dropped the new mockups in the chat',
    timestamp: 'Mon',
    unreadCount: 0,
    participants: ['Riley', 'Alex', 'Jordan'],
  },
];

function getInitials(name: string, isGroup: boolean) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (isGroup) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const first = parts[0]?.[0];
  const second = parts[1]?.[0];
  return (first ?? '').concat(second ?? '').toUpperCase();
}

export default function ChatListScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const filtered = CONVERSATIONS.filter((conv) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      conv.name,
      ...conv.participants,
      conv.lastMessage,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            Messages
          </ThemedText>
          <TouchableOpacity
            style={styles.newButton}
            onPress={() => {
              // Placeholder for starting a new chat / group
              router.push('/(tabs)/(chat)');
            }}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.newButtonText}>+</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrapper}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search people or groups"
            placeholderTextColor={Colors.dark.tabIconDefault}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {filtered.map((conv) => (
            <Pressable
              key={conv.id}
              onPress={() => router.push(`/(tabs)/(chat)/room/${conv.id}`)}
              style={({ pressed }) => [pressed && styles.roomPressed]}
            >
              <ThemedView
                style={styles.roomCard}
                lightColor={Colors.light.card}
                darkColor={Colors.dark.card}
              >
                <View style={styles.row}>
                  <View
                    style={[
                      styles.avatar,
                      conv.isGroup ? styles.avatarGroup : styles.avatarDirect,
                    ]}
                  >
                    <ThemedText style={styles.avatarText}>
                      {getInitials(conv.name, conv.isGroup)}
                    </ThemedText>
                  </View>

                  <View style={styles.roomMain}>
                    <View style={styles.roomTop}>
                      <ThemedText
                        type="defaultSemiBold"
                        style={styles.roomName}
                        numberOfLines={1}
                      >
                        {conv.name}
                      </ThemedText>
                      <ThemedText
                        style={styles.timestamp}
                        lightColor={Colors.light.icon}
                        darkColor={Colors.dark.icon}
                      >
                        {conv.timestamp}
                      </ThemedText>
                    </View>

                    <View style={styles.roomBottom}>
                      <ThemedText
                        style={styles.lastMessage}
                        lightColor={Colors.light.icon}
                        darkColor={Colors.dark.icon}
                        numberOfLines={1}
                      >
                        {conv.lastMessage}
                      </ThemedText>
                      {conv.unreadCount > 0 && (
                        <View style={styles.badge}>
                          <ThemedText style={styles.badgeText}>
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </ThemedView>
            </Pressable>
          ))}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
  },
  newButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBB6CE', // pink accent
  },
  newButtonText: {
    color: Colors.dark.background,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 4,
  },
  searchInput: {
    backgroundColor: Colors.dark.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    color: Colors.dark.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  roomPressed: {
    opacity: 0.85,
  },
  roomCard: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDirect: {
    backgroundColor: '#FBB6CE',
  },
  avatarGroup: {
    backgroundColor: '#F6E05E',
  },
  avatarText: {
    color: Colors.dark.background,
    fontSize: 18,
    fontWeight: '700',
  },
  roomMain: {
    flex: 1,
  },
  roomTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  roomName: {
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
  },
  roomBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    opacity: 0.9,
  },
  badge: {
    backgroundColor: Colors.dark.tint,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: Colors.dark.background,
    fontSize: 12,
    fontWeight: '700',
  },
});
