import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { SlideInUp } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { AppColors, Colors } from '@/constants/theme';
import { BUTTON_HEIGHT, Spacing } from '@/constants/spacing';
import { CHALLENGE_GAME_PICKS } from '@/lib/challenge-games';
import { GAME_NAMES, generateRoomCode } from '@/lib/room-utils';
import { supabase } from '@/lib/supabase';

const SENDER_NAME = 'Guest';

const ROOM_NAMES: Record<string, string> = {
  '1': 'Alex Rivera',
  '2': 'Sam Okonkwo',
  '3': 'Jordan & Riley',
};

type Message = {
  id: string;
  room_id: string;
  sender_name: string;
  content: string;
  created_at: string;
};

type DisplayMessage = { id: string; text: string; isSent: boolean; timestamp?: string };

function formatTime(createdAt: string): string {
  try {
    const d = new Date(createdAt);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function toDisplayMessage(msg: Message): DisplayMessage {
  return {
    id: msg.id,
    text: msg.content,
    isSent: msg.sender_name === SENDER_NAME,
    timestamp: formatTime(msg.created_at),
  };
}

const INPUT_BAR_HEIGHT = 44;
/** paddingVertical 6+6 on input row + bar min height + gap above keyboard */
const INPUT_AREA_BOTTOM_RESERVE = INPUT_BAR_HEIGHT + 12 + 8;

function initialsForRoomName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
}

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const roomId = String(id ?? '1');
  const roomName = ROOM_NAMES[roomId] ?? 'Chat';

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [useLocalOnly, setUseLocalOnly] = useState(false);
  const localIdRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const sendLockRef = useRef(false);

  // Fetch initial messages from Supabase (persisted between sessions)
  useEffect(() => {
    async function fetchMessages() {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id, room_id, sender_name, content, created_at')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (error) {
          setUseLocalOnly(true);
          setMessages([]);
          return;
        }
        const display = (data ?? []).map(toDisplayMessage);
        setMessages(display);
        if (display.length > 0) {
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
        }
      } catch {
        setUseLocalOnly(true);
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMessages();
  }, [roomId]);

  // Subscribe to real-time inserts (only when Supabase is available)
  useEffect(() => {
    if (useLocalOnly) return;

    const channel = supabase
      .channel(`messages:room_id=eq.${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newRow = payload.new as Message;
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === newRow.id);
            if (exists) return prev;
            const next = [...prev, toDisplayMessage(newRow)];
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, useLocalOnly]);

  const submitMessage = useCallback(
    async (trimmed: string, clearInput: boolean) => {
      if (!trimmed || sendLockRef.current) return;
      sendLockRef.current = true;
      setIsSending(true);
      if (clearInput) setInputText('');

      try {
        if (useLocalOnly) {
          localIdRef.current += 1;
          const localMsg: DisplayMessage = {
            id: `local-${localIdRef.current}`,
            text: trimmed,
            isSent: true,
            timestamp: 'Just now',
          };
          setMessages((prev) => [...prev, localMsg]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
          return;
        }

        const payload = { room_id: roomId, sender_name: SENDER_NAME, content: trimmed };

        try {
          const { data, error } = await supabase
            .from('messages')
            .insert(payload)
            .select('id')
            .single();

          if (error) {
            setUseLocalOnly(true);
            localIdRef.current += 1;
            setMessages((prev) => [
              ...prev,
              { id: `local-${localIdRef.current}`, text: trimmed, isSent: true, timestamp: 'Just now' },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: String(data?.id ?? `temp-${Date.now()}`),
                text: trimmed,
                isSent: true,
                timestamp: 'Just now',
              },
            ]);
          }
        } catch {
          setUseLocalOnly(true);
          localIdRef.current += 1;
          setMessages((prev) => [
            ...prev,
            { id: `local-${localIdRef.current}`, text: trimmed, isSent: true },
          ]);
        }
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      } finally {
        sendLockRef.current = false;
        setIsSending(false);
      }
    },
    [roomId, useLocalOnly]
  );

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    void submitMessage(trimmed, true);
  }, [inputText, submitMessage]);

  const handlePickChallengeGame = useCallback(
    async (gameType: string) => {
      setShowGamePicker(false);
      const code = generateRoomCode();
      const gameName = GAME_NAMES[gameType] ?? gameType;
      const text = `🎮 ${gameName} challenge! Join with code ${code} — Play → Join room.`;
      await submitMessage(text, true);
      router.push({
        pathname: '/(tabs)/play/create-room',
        params: {
          challengeGame: gameType,
          challengeCode: code,
          challengeFriend: roomName,
        },
      });
    },
    [roomName, submitMessage, router]
  );

  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  const hasInput = inputText.trim().length > 0;

  const listBottomPad = INPUT_AREA_BOTTOM_RESERVE + insets.bottom;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.main, { backgroundColor: palette.background }]}>
        {/* Header - respects safe area */}
        <View style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.cardBorder }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons name="arrow-back" size={24} color={palette.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
              {roomName}
            </ThemedText>
            <View style={styles.onlineStatus}>
              <View style={styles.onlineDot} />
              <Text style={[styles.onlineText, { color: palette.icon }]}>Online</Text>
            </View>
          </View>
        </View>

        <View style={[styles.contentBelowHeader, { paddingBottom: listBottomPad }]}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={palette.tint} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyAvatarWrap}>
              <Avatar initials={initialsForRoomName(roomName)} size="xlarge" />
            </View>
            <ThemedText type="heading" style={styles.emptyRoomName}>
              {roomName}
            </ThemedText>
            <ThemedText type="body" style={[styles.emptyTagline, { color: AppColors.muted }]}>
              Be the first to say hello!
            </ThemedText>
            <View style={styles.quickActions}>
              <Pressable
                onPress={() => void submitMessage('Hi! 👋', false)}
                disabled={isSending}
                style={({ pressed }) => [
                  styles.quickBtn,
                  { backgroundColor: palette.tint, opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <ThemedText type="caption" style={styles.quickBtnText}>
                  Say Hi 👋
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(tabs)/play')}
                style={({ pressed }) => [
                  styles.quickBtn,
                  styles.quickBtnOutline,
                  {
                    borderColor: palette.cardBorder,
                    backgroundColor: palette.card,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <ThemedText type="caption" style={[styles.quickBtnText, { color: palette.text }]}>
                  Invite to Game 🎮
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={[styles.messagesContent, { paddingBottom: 12 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[styles.bubbleWrap, msg.isSent ? styles.bubbleWrapSent : styles.bubbleWrapReceived]}
              >
                <View
                  style={[
                    styles.bubble,
                    msg.isSent ? styles.bubbleSent : styles.bubbleReceived,
                    msg.isSent
                      ? { backgroundColor: palette.tint }
                      : { backgroundColor: palette.card, borderColor: palette.cardBorder },
                  ]}
                >
                  <ThemedText
                    style={[styles.bubbleText, msg.isSent && styles.bubbleTextSent]}
                    lightColor={msg.isSent ? '#FFFFFF' : undefined}
                    darkColor={msg.isSent ? palette.background : undefined}
                  >
                    {msg.text}
                  </ThemedText>
                </View>
                {msg.timestamp && (
                  <Text
                    style={[
                      styles.timestamp,
                      msg.isSent ? styles.timestampSent : styles.timestampReceived,
                      { color: msg.isSent ? palette.text : palette.icon },
                    ]}
                  >
                    {msg.timestamp}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        )}
        </View>

        <Animated.View
          entering={SlideInUp.delay(200).springify().damping(18)}
          style={[
            styles.inputRow,
            {
              backgroundColor: palette.card,
              borderTopColor: palette.cardBorder,
              minHeight: INPUT_BAR_HEIGHT,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.composeGameBtn,
              {
                backgroundColor: palette.background,
                borderColor: palette.cardBorder,
              },
            ]}
            onPress={() => setShowGamePicker(true)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityLabel="Pick a game to challenge"
          >
            <MaterialIcons name="sports-esports" size={22} color={palette.tint} />
          </TouchableOpacity>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.background,
                borderColor: palette.cardBorder,
                color: palette.text,
              },
            ]}
            placeholder="Type a message..."
            placeholderTextColor={palette.tabIconDefault}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="default"
            blurOnSubmit={false}
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: hasInput && !isSending ? palette.tint : palette.cardBorder,
              },
            ]}
            onPress={handleSend}
            disabled={!hasInput || isSending}
            activeOpacity={0.7}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={palette.background} />
            ) : (
              <MaterialIcons
                name="send"
                size={18}
                color={hasInput ? palette.background : palette.tabIconDefault}
              />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Modal visible={showGamePicker} animationType="slide" transparent>
        <Pressable style={styles.pickerOverlay} onPress={() => setShowGamePicker(false)}>
          <Pressable
            style={[styles.pickerSheet, { backgroundColor: palette.background }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText type="title" style={styles.pickerTitle}>
              Challenge {roomName}
            </ThemedText>
            <ThemedText type="caption" style={[styles.pickerHint, { color: palette.icon }]}>
              We&apos;ll post the room code here and open your lobby.
            </ThemedText>
            {CHALLENGE_GAME_PICKS.map((game) => (
              <Pressable
                key={game.id}
                onPress={() => void handlePickChallengeGame(game.id)}
                style={({ pressed }) => [
                  styles.pickerRow,
                  { backgroundColor: palette.card, borderColor: palette.cardBorder },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.pickerEmoji}>{game.emoji}</Text>
                <ThemedText type="defaultSemiBold" style={styles.pickerGameName}>
                  {game.name}
                </ThemedText>
                <MaterialIcons name="chevron-right" size={22} color={palette.icon} />
              </Pressable>
            ))}
            <Pressable onPress={() => setShowGamePicker(false)} style={styles.pickerCancel}>
              <ThemedText style={{ color: palette.icon }}>Cancel</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  main: { flex: 1, position: 'relative' },
  contentBelowHeader: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { marginRight: 12 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18 },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#68D391',
  },
  onlineText: { fontSize: 13 },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  emptyAvatarWrap: { marginBottom: Spacing.sm },
  emptyRoomName: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTagline: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  quickActions: {
    width: '100%',
    maxWidth: 320,
    gap: Spacing.sm,
  },
  quickBtn: {
    height: BUTTON_HEIGHT,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  quickBtnOutline: {
    borderWidth: 1,
  },
  quickBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  bubbleWrap: {
    marginBottom: 12,
  },
  bubbleWrapSent: {
    alignItems: 'flex-end',
  },
  bubbleWrapReceived: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  bubbleSent: {
    borderBottomRightRadius: 6,
  },
  bubbleReceived: {
    borderWidth: 1,
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleTextSent: {},
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  timestampSent: { textAlign: 'right' },
  timestampReceived: { textAlign: 'left' },
  inputRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    borderTopWidth: 1,
    zIndex: 2,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 15,
    maxHeight: 80,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeGameBtn: {
    width: 40,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    gap: 12,
  },
  pickerTitle: { fontSize: 22 },
  pickerHint: { marginBottom: 4 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  pickerEmoji: { fontSize: 22 },
  pickerGameName: { flex: 1, fontSize: 16 },
  pickerCancel: { alignItems: 'center', paddingVertical: 12 },
});
