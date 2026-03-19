import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const SENDER_NAME = 'Guest';

const ROOM_NAMES: Record<string, string> = {
  '1': 'General',
  '2': 'Friends',
  '3': 'Gaming',
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

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const roomId = String(id ?? '1');
  const roomName = ROOM_NAMES[roomId] ?? 'Chat';

  console.log('[Chat] Screen opened, roomId:', roomId, 'id param:', id);

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [useLocalOnly, setUseLocalOnly] = useState(false);
  const localIdRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  // Fetch initial messages from Supabase (persisted between sessions)
  useEffect(() => {
    async function fetchMessages() {
      console.log('[Chat] Fetching messages for room_id:', roomId);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id, room_id, sender_name, content, created_at')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (error) {
          console.log('[Chat] Fetch error:', error.message, error);
          setUseLocalOnly(true);
          setMessages([]);
          return;
        }
        const display = (data ?? []).map(toDisplayMessage);
        console.log('[Chat] Fetched', display.length, 'messages for room', roomId);
        setMessages(display);
        if (display.length > 0) {
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
        }
      } catch (err) {
        console.log('[Chat] Fetch exception:', err);
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
    if (useLocalOnly) {
      console.log('[Chat] Skipping realtime subscription (local-only mode)');
      return;
    }

    console.log('[Chat] Subscribing to realtime for room_id:', roomId);
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
          console.log('[Chat] Realtime INSERT received:', newRow?.id, newRow?.content?.slice(0, 30));
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

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInputText('');

    if (useLocalOnly) {
      localIdRef.current += 1;
      const localMsg: DisplayMessage = {
        id: `local-${localIdRef.current}`,
        text: trimmed,
        isSent: true,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, localMsg]);
      setIsSending(false);
      return;
    }

    const payload = { room_id: roomId, sender_name: SENDER_NAME, content: trimmed };
    console.log('[Chat] Sending to Supabase:', payload);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert(payload)
        .select('id')
        .single();

      if (error) {
        console.log('[Chat] Insert error:', error.message, error);
        setUseLocalOnly(true);
        localIdRef.current += 1;
        setMessages((prev) => [
          ...prev,
          { id: `local-${localIdRef.current}`, text: trimmed, isSent: true, timestamp: 'Just now' },
        ]);
      } else {
        console.log('[Chat] Message saved to Supabase, id:', data?.id);
        setMessages((prev) => [
          ...prev,
          { id: String(data?.id ?? `temp-${Date.now()}`), text: trimmed, isSent: true, timestamp: 'Just now' },
        ]);
      }
    } catch (err) {
      console.log('[Chat] Insert exception:', err);
      setUseLocalOnly(true);
      localIdRef.current += 1;
      setMessages((prev) => [
        ...prev,
        { id: `local-${localIdRef.current}`, text: trimmed, isSent: true },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [inputText, roomId, isSending, useLocalOnly]);

  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Flat header */}
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

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.dark.tint} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
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
                ]}
              >
                <ThemedText
                  style={[styles.bubbleText, msg.isSent && styles.bubbleTextSent]}
                  darkColor={msg.isSent ? Colors.dark.background : undefined}
                >
                  {msg.text}
                </ThemedText>
              </View>
              {msg.timestamp && (
                <Text style={[styles.timestamp, msg.isSent ? styles.timestampSent : styles.timestampReceived]}>
                  {msg.timestamp}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Input bar - WhatsApp/iMessage style */}
      <Animated.View
        entering={SlideInUp.delay(200).springify().damping(18)}
        style={[styles.inputRow, { backgroundColor: palette.card, borderTopColor: palette.cardBorder }]}
      >
        <Pressable style={styles.inputIconBtn} onPress={() => {}}>
          <MaterialIcons name="mic" size={24} color={palette.tint} />
        </Pressable>
        <TextInput
          style={[styles.input, { backgroundColor: palette.background, borderColor: palette.cardBorder, color: palette.text }]}
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
        <Pressable style={styles.inputIconBtn} onPress={() => {}}>
          <MaterialIcons name="emoji-emotions" size={24} color={palette.tint} />
        </Pressable>
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: inputText.trim() && !isSending ? Colors.dark.tint : palette.cardBorder },
            (!inputText.trim() || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          activeOpacity={0.7}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={Colors.dark.background} />
          ) : (
            <MaterialIcons
              name="send"
              size={22}
              color={inputText.trim() ? Colors.dark.background : palette.tabIconDefault}
            />
          )}
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: { marginRight: 12 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18 },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 8,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  bubbleSent: {
    backgroundColor: Colors.dark.tint,
    borderBottomRightRadius: 6,
  },
  bubbleReceived: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleTextSent: {
    color: Colors.dark.background,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  timestampSent: { textAlign: 'right', color: Colors.dark.text },
  timestampReceived: { textAlign: 'left', color: Colors.dark.icon },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
  },
  inputIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
});
