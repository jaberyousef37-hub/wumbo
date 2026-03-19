import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BaseCard } from '@/components/base-card';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';

const CHAT_ROOMS = [
  {
    id: '1',
    name: 'General',
    lastMessage: 'See you at the game night!',
    timestamp: '2m ago',
    unreadCount: 3,
  },
  {
    id: '2',
    name: 'Friends',
    lastMessage: 'Alex: That movie was amazing',
    timestamp: '1h ago',
    unreadCount: 0,
  },
  {
    id: '3',
    name: 'Gaming',
    lastMessage: "Who's down for a round?",
    timestamp: '5m ago',
    unreadCount: 12,
  },
];

function ChatRoomCard({
  room,
  index,
}: {
  room: (typeof CHAT_ROOMS)[0];
  index: number;
}) {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify().damping(16)}>
      <BaseCard
        onPress={() => router.push(`/(tabs)/chat/${room.id}`)}
        showChevron
      >
        <View style={styles.roomRow}>
          <Avatar initials={room.name} size="medium" />
          <View style={styles.roomMain}>
            <View style={styles.roomTop}>
              <ThemedText type="defaultSemiBold" style={styles.roomName} numberOfLines={1}>
                {room.name}
              </ThemedText>
              <ThemedText
                style={styles.timestamp}
                lightColor={Colors.light.icon}
                darkColor={Colors.dark.icon}
              >
                {room.timestamp}
              </ThemedText>
            </View>
            <View style={styles.roomBottom}>
              <ThemedText
                type="defaultSemiBold"
                style={[styles.lastMessage, { color: palette.text }]}
                numberOfLines={1}
              >
                {room.lastMessage}
              </ThemedText>
              {room.unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: palette.tint }]}>
                  <ThemedText style={styles.badgeText} darkColor="#fff">
                    {room.unreadCount > 99 ? '99+' : room.unreadCount}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>
      </BaseCard>
    </Animated.View>
  );
}

function NewConversationModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.modalContent, { backgroundColor: palette.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <ThemedText type="title" style={styles.modalTitle}>
              New Conversation
            </ThemedText>
            <Pressable onPress={onClose} hitSlop={12} style={styles.modalClose}>
              <MaterialIcons name="close" size={28} color={palette.text} />
            </Pressable>
          </View>
          <TextInput
            style={[
              styles.modalInput,
              {
                backgroundColor: palette.card,
                borderColor: palette.cardBorder,
                color: palette.text,
              },
            ]}
            placeholder="Enter name or username"
            placeholderTextColor={palette.tabIconDefault}
            value={name}
            onChangeText={setName}
          />
          <PrimaryButton
            label="Start Chat"
            onPress={() => {
              onClose();
              setName('');
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ChatScreen() {
  const [showNewConversation, setShowNewConversation] = useState(false);
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Wumbo Chat</ThemedText>
          <Pressable
            onPress={() => setShowNewConversation(true)}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          >
            <MaterialIcons name="add" size={28} color="#fff" />
          </Pressable>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {CHAT_ROOMS.map((room, index) => (
            <ChatRoomCard key={room.id} room={room} index={index} />
          ))}
        </ScrollView>
      </Animated.View>

      <NewConversationModal
        visible={showNewConversation}
        onClose={() => setShowNewConversation(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roomMain: { flex: 1, marginLeft: Spacing.sm, minWidth: 0 },
  roomTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  roomName: { flex: 1, marginRight: Spacing.xs },
  timestamp: { fontSize: 12 },
  roomBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  lastMessage: { flex: 1, fontSize: 15 },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.tint,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  fabPressed: { opacity: 0.9 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalTitle: { fontSize: 24 },
  modalClose: { padding: Spacing.xs },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.sm,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
});
