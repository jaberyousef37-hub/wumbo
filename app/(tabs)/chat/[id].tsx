import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { AppColors, Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import { useTheme } from '@/contexts/theme-context';
import {
  CHALLENGE_GAME_PICKS,
  gameEmojiForId,
  gameGradientForId,
  gameNameForId,
} from '@/lib/challenge-games';
import {
  encodeRichPayload,
  tryParseRichPayload,
  type RichImagePayload,
  type RichInvitePayload,
} from '@/lib/chat-rich-content';
import { generateRoomCode } from '@/lib/room-utils';
import { supabase } from '@/lib/supabase';

type SupabaseMessageRow = {
  id: string;
  room_id: string;
  sender_name: string;
  content: string;
  created_at: string;
};

function rowToMessage(row: SupabaseMessageRow, senderName: string): ChatMessage {
  const isSent = !!senderName && row.sender_name === senderName;
  const base = { id: row.id, createdAt: row.created_at, isSent };
  const rich = tryParseRichPayload(row.content);
  if (rich?.t === 'img') {
    const p = rich as RichImagePayload;
    return { ...base, kind: 'image', imageUri: `data:${p.mime};base64,${p.b64}`, caption: p.caption };
  }
  if (rich?.t === 'invite') {
    const p = rich as RichInvitePayload;
    return { ...base, kind: 'invite', gameId: p.gameId, code: p.code };
  }
  return { ...base, kind: 'text', text: row.content };
}

const ROOM_NAMES: Record<string, string> = {
  '1': 'Alex Rivera',
  '2': 'Sam Okonkwo',
  '3': 'Jordan & Riley',
};

const REACTION_PICKER_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥'] as const;

const INPUT_EMOJI_SHEET = ['😀', '😂', '🥹', '❤️', '🔥', '👍', '👎', '😮', '😢', '🎉', '✨', '🙏'];

type ChatMessageBase = {
  id: string;
  createdAt: string;
  isSent: boolean;
};

type ChatTextMessage = ChatMessageBase & { kind: 'text'; text: string };
type ChatImageMessage = ChatMessageBase & { kind: 'image'; imageUri: string; caption?: string };
type ChatInviteMessage = ChatMessageBase & { kind: 'invite'; gameId: string; code: string };

type ChatMessage = ChatTextMessage | ChatImageMessage | ChatInviteMessage;

type ReceiptStatus = 'sent' | 'delivered' | 'read';

const BUBBLE_PURPLE = AppColors.tint;
const BUBBLE_RECEIVED = '#3A3A3C';
const READ_BLUE = '#34B7F1';
const COMPOSER_BORDER = '#333333';
const INPUT_FILL = '#1a1a1a';
const SEND_ACTIVE = '#7C3AED';
const SEND_DISABLED = '#555555';

const THIRTY_MIN_MS = 30 * 60 * 1000;

/** Initial header height before onLayout (iOS KeyboardAvoidingView offset). */
const CHAT_HEADER_LAYOUT_HEIGHT = 56;

function reactionsStorageKey(roomId: string): string {
  return `wumbo-chat-reactions-v1-${roomId}`;
}

function messagesStorageKey(roomId: string): string {
  return `wumbo-chat-messages-v1-${roomId}`;
}

function shouldShowTimeDivider(prevIso: string | undefined, currIso: string): boolean {
  if (!prevIso) return false;
  const a = new Date(prevIso).getTime();
  const b = new Date(currIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return b - a >= THIRTY_MIN_MS;
}

function formatDividerLabel(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (msgDay === today) return `Today ${timeStr}`;
    if (msgDay === today - 86400000) return `Yesterday ${timeStr}`;
    return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function initialsForRoomName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
}

function ReceiptLine({
  status,
  mutedColor,
}: {
  status: ReceiptStatus;
  mutedColor: string;
}) {
  const label = status === 'sent' ? 'Sent' : status === 'delivered' ? 'Delivered' : 'Read';
  const read = status === 'read';
  const checkColor = read ? READ_BLUE : mutedColor;
  return (
    <View style={styles.receiptRow}>
      {status === 'sent' ? (
        <MaterialIcons name="check" size={14} color={checkColor} />
      ) : (
        <MaterialIcons name="done-all" size={14} color={checkColor} />
      )}
      <Text style={[styles.receiptLabel, { color: mutedColor }]}>{label}</Text>
    </View>
  );
}

function BubbleTail({ color, align }: { color: string; align: 'left' | 'right' }) {
  const base = {
    position: 'absolute' as const,
    bottom: 2,
    width: 10,
    height: 10,
    backgroundColor: color,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  };
  return (
    <View
      style={[
        base,
        align === 'right' ? { right: -3 } : { left: -3 },
      ]}
    />
  );
}

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(CHAT_HEADER_LAYOUT_HEIGHT);

  const roomId = String(id ?? '1');
  const roomName = ROOM_NAMES[roomId] ?? 'Chat';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [pendingImage, setPendingImage] = useState<{
    uri: string;
    base64: string;
    mime: string;
  } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [showEmojiSheet, setShowEmojiSheet] = useState(false);
  const [reactionPickerForId, setReactionPickerForId] = useState<string | null>(null);
  const [messagesHydrated, setMessagesHydrated] = useState(false);
  const [receipts, setReceipts] = useState<Record<string, ReceiptStatus>>({});
  const [messageReactions, setMessageReactions] = useState<Record<string, Record<string, number>>>({});

  const localIdRef = useRef(0);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const sendLockRef = useRef(false);
  const receiptScheduledRef = useRef(new Set<string>());
  const senderNameRef = useRef('');
  const listLayoutReadyRef = useRef(false);
  const pendingScrollRef = useRef(false);

  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  const muted = AppColors.muted;

  const hasSendableContent = inputText.trim().length > 0 || pendingImage !== null;

  // Load persistent sender identity (stable per-device guest name)
  useEffect(() => {
    void (async () => {
      let name = await AsyncStorage.getItem('wumbo-sender-name');
      if (!name) {
        name = `guest-${Math.random().toString(36).slice(2, 10)}`;
        await AsyncStorage.setItem('wumbo-sender-name', name);
      }
      senderNameRef.current = name;
    })();
  }, []);

  // Load reactions from local cache
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(reactionsStorageKey(roomId));
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw) as Record<string, Record<string, number>>;
          if (parsed && typeof parsed === 'object') setMessageReactions(parsed);
        }
      } catch (e) {
        if (__DEV__) console.warn('[Chat] Failed to load reactions from storage', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    const showEv = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEv = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEv, () => setKeyboardOpen(true));
    const h = Keyboard.addListener(hideEv, () => setKeyboardOpen(false));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  // Fetch messages from Supabase on focus; fall back to local cache if offline
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });
          if (cancelled) return;
          if (!error && data) {
            const mapped = (data as SupabaseMessageRow[]).map((row) =>
              rowToMessage(row, senderNameRef.current)
            );
            setMessages(mapped);
            // Update local cache for offline fallback
            void AsyncStorage.setItem(messagesStorageKey(roomId), JSON.stringify(mapped));
          } else {
            // Supabase unavailable — load from local cache
            const raw = await AsyncStorage.getItem(messagesStorageKey(roomId));
            if (!cancelled && raw) {
              const parsed = JSON.parse(raw) as unknown;
              if (Array.isArray(parsed)) setMessages(parsed as ChatMessage[]);
            }
          }
        } catch {
          try {
            const raw = await AsyncStorage.getItem(messagesStorageKey(roomId));
            if (!cancelled && raw) {
              const parsed = JSON.parse(raw) as unknown;
              if (Array.isArray(parsed)) setMessages(parsed as ChatMessage[]);
            }
          } catch (e) {
            if (__DEV__) console.warn('[Chat] Failed to load messages from storage fallback', e);
          }
        } finally {
          if (!cancelled) setMessagesHydrated(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [roomId])
  );

  useEffect(() => {
    if (!messagesHydrated || messages.length === 0) return;
    const id = requestAnimationFrame(() => {
      if (listLayoutReadyRef.current) {
        flatListRef.current?.scrollToEnd({ animated: false });
      } else {
        pendingScrollRef.current = true;
      }
    });
    return () => cancelAnimationFrame(id);
  }, [messagesHydrated, messages.length]);

  // Realtime subscription — append incoming messages and resolve optimistic sends
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as SupabaseMessageRow;
          const msg = rowToMessage(row, senderNameRef.current);
          setMessages((prev) => {
            // Already present (real ID confirmed by insert response) → skip
            if (prev.some((m) => m.id === msg.id)) return prev;
            // Own message still showing with optimistic local- id → replace it
            if (msg.isSent) {
              const localIdx = prev.findIndex((m) => m.id.startsWith('local-'));
              if (localIdx >= 0) {
                const next = [...prev];
                next[localIdx] = msg;
                return next;
              }
            }
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    for (const m of messages) {
      if (!m.isSent) continue;
      if (receiptScheduledRef.current.has(m.id)) continue;
      receiptScheduledRef.current.add(m.id);
      setReceipts((r) => ({ ...r, [m.id]: 'sent' }));
      timeouts.push(
        setTimeout(() => {
          setReceipts((r) => ({ ...r, [m.id]: 'delivered' }));
        }, 450)
      );
      timeouts.push(
        setTimeout(() => {
          setReceipts((r) => ({ ...r, [m.id]: 'read' }));
        }, 2200)
      );
    }
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [messages]);

  const scrollToLatest = useCallback((animated: boolean) => {
    flatListRef.current?.scrollToEnd({ animated });
  }, []);

  const scrollToLatestSoon = useCallback(
    (animated: boolean) => {
      setTimeout(() => scrollToLatest(animated), 50);
    },
    [scrollToLatest]
  );

  const submitContent = useCallback(
    (content: string, clearComposer: boolean) => {
      if (!content || sendLockRef.current) return;
      sendLockRef.current = true;
      setIsSending(true);
      if (clearComposer) {
        setInputText('');
        setPendingImage(null);
      }

      const createdAt = new Date().toISOString();

      try {
        localIdRef.current += 1;
        const idLocal = `local-${localIdRef.current}`;
        const rich = tryParseRichPayload(content);
        let localMsg: ChatMessage;
        if (rich?.t === 'img') {
          const p = rich as RichImagePayload;
          localMsg = {
            id: idLocal,
            createdAt,
            isSent: true,
            kind: 'image',
            imageUri: `data:${p.mime};base64,${p.b64}`,
            caption: p.caption,
          };
        } else if (rich?.t === 'invite') {
          const p = rich as RichInvitePayload;
          localMsg = {
            id: idLocal,
            createdAt,
            isSent: true,
            kind: 'invite',
            gameId: p.gameId,
            code: p.code,
          };
        } else {
          localMsg = { id: idLocal, createdAt, isSent: true, kind: 'text', text: content };
        }
        setMessages((prev) => [...prev, localMsg]);
        scrollToLatestSoon(true);
        // Persist to Supabase; swap optimistic local-id for server UUID on success
        void supabase
          .from('messages')
          .insert({
            room_id: roomId,
            sender_name: senderNameRef.current || 'guest',
            content,
          })
          .select('id, created_at')
          .single()
          .then(({ data }) => {
            if (data) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === idLocal
                    ? { ...m, id: data.id as string, createdAt: data.created_at as string }
                    : m
                )
              );
            }
          });
      } finally {
        sendLockRef.current = false;
        setIsSending(false);
      }
    },
    [roomId, scrollToLatestSoon]
  );

  const handleSend = useCallback(() => {
    if (!hasSendableContent || isSending) return;
    if (pendingImage) {
      const caption = inputText.trim() || undefined;
      const body = encodeRichPayload({
        t: 'img',
        mime: pendingImage.mime,
        b64: pendingImage.base64,
        caption,
      });
      void submitContent(body, true);
      return;
    }
    const trimmed = inputText.trim();
    if (!trimmed) return;
    void submitContent(trimmed, true);
  }, [hasSendableContent, inputText, isSending, pendingImage, submitContent]);

  const handlePickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.55,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mime = asset.mimeType ?? 'image/jpeg';
    if (!asset.base64) return;
    setPendingImage({ uri: asset.uri, base64: asset.base64, mime });
  }, []);

  const handlePickChallengeGame = useCallback(
    (gameType: string) => {
      setShowGamePicker(false);
      const code = generateRoomCode();
      const body = encodeRichPayload({ t: 'invite', gameId: gameType, code });
      submitContent(body, true);
      router.push({
        pathname: '/(tabs)/play/create-room',
        params: {
          challengeGame: gameType,
          challengeCode: code,
          challengeFriend: roomName,
        },
      });
    },
    [roomName, router, submitContent]
  );

  const handleAcceptInvite = useCallback(
    (invite: { gameId: string; code: string }, fromSelf: boolean) => {
      if (fromSelf) {
        router.push({
          pathname: '/(tabs)/play/create-room',
          params: {
            challengeGame: invite.gameId,
            challengeCode: invite.code,
            challengeFriend: roomName,
          },
        });
      } else {
        router.push({
          pathname: '/(tabs)/play/join-room',
          params: { code: invite.code },
        });
      }
    },
    [roomName, router]
  );

  const appendReaction = useCallback((messageId: string, emoji: string) => {
    setReactionPickerForId(null);
    setMessageReactions((prev) => {
      const row = prev[messageId] ?? {};
      const next = {
        ...prev,
        [messageId]: { ...row, [emoji]: (row[emoji] ?? 0) + 1 },
      };
      void AsyncStorage.setItem(reactionsStorageKey(roomId), JSON.stringify(next));
      return next;
    });
  }, [roomId]);

  const onLongPressMessage = useCallback((messageId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReactionPickerForId(messageId);
  }, []);

  const renderReactions = (messageId: string, align: 'left' | 'right') => {
    const map = messageReactions[messageId];
    if (!map || Object.keys(map).length === 0) return null;
    const entries = Object.entries(map).filter(([, n]) => n > 0);
    if (entries.length === 0) return null;
    return (
      <View style={[styles.reactionStrip, align === 'right' ? styles.reactionStripRight : styles.reactionStripLeft]}>
        {entries.map(([emoji, count]) => (
          <View key={emoji} style={[styles.reactionChip, { borderColor: palette.cardBorder }]}>
            <Text style={styles.reactionChipText}>
              {emoji}
              {count > 1 ? ` ${count}` : ''}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderBubbleContent = (msg: ChatMessage) => {
    if (msg.kind === 'text') {
      return (
        <Text style={[styles.bubbleText, msg.isSent ? styles.bubbleTextSent : styles.bubbleTextReceived]}>
          {msg.text}
        </Text>
      );
    }
    if (msg.kind === 'image') {
      return (
        <View>
          <Image source={{ uri: msg.imageUri }} style={styles.inlineImage} contentFit="cover" />
          {msg.caption ? (
            <Text style={[styles.bubbleText, msg.isSent ? styles.bubbleTextSent : styles.bubbleTextReceived, styles.imageCaption]}>
              {msg.caption}
            </Text>
          ) : null}
        </View>
      );
    }
    const g = gameGradientForId(msg.gameId);
    const emoji = gameEmojiForId(msg.gameId);
    const gname = gameNameForId(msg.gameId);
    return (
      <LinearGradient colors={[...g]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.inviteInner}>
        <Text style={styles.inviteEmoji}>{emoji}</Text>
        <Text style={styles.inviteTitle}>{gname}</Text>
        <Text style={styles.inviteCode}>Room code · {msg.code}</Text>
        <Pressable
          onPress={() => handleAcceptInvite({ gameId: msg.gameId, code: msg.code }, msg.isSent)}
          style={({ pressed }) => [styles.acceptBtn, { opacity: pressed ? 0.88 : 1 }]}
        >
          <Text style={styles.acceptBtnText}>Accept Challenge</Text>
        </Pressable>
      </LinearGradient>
    );
  };

  const renderMessage = (msg: ChatMessage, prev: ChatMessage | undefined) => {
    const showDivider = shouldShowTimeDivider(prev?.createdAt, msg.createdAt);
    const receipt = receipts[msg.id] ?? 'sent';

    const bubbleJsx = (
      <Pressable
        onLongPress={() => onLongPressMessage(msg.id)}
        delayLongPress={380}
        style={({ pressed }) => [pressed && { opacity: 0.92 }]}
      >
        <View style={styles.bubbleOuter}>
          {msg.kind === 'invite' ? (
            <View style={[styles.bubble, msg.isSent ? styles.bubbleSentShape : styles.bubbleReceivedShape, { overflow: 'hidden', padding: 0 }]}>
              {renderBubbleContent(msg)}
            </View>
          ) : (
            <View
              style={[
                styles.bubble,
                msg.isSent ? styles.bubbleSentShape : styles.bubbleReceivedShape,
                {
                  backgroundColor: msg.isSent ? BUBBLE_PURPLE : BUBBLE_RECEIVED,
                },
              ]}
            >
              {renderBubbleContent(msg)}
              <BubbleTail color={msg.isSent ? BUBBLE_PURPLE : BUBBLE_RECEIVED} align={msg.isSent ? 'right' : 'left'} />
            </View>
          )}
        </View>
      </Pressable>
    );

    return (
      <View key={msg.id}>
        {showDivider ? (
          <View style={styles.timeDividerWrap}>
            <Text style={[styles.timeDividerText, { color: muted }]}>{formatDividerLabel(msg.createdAt)}</Text>
          </View>
        ) : null}

        {msg.isSent ? (
          <View style={styles.rowSent}>
            <View style={styles.sentColumn}>
              {bubbleJsx}
              {renderReactions(msg.id, 'right')}
              <ReceiptLine status={receipt} mutedColor={muted} />
            </View>
          </View>
        ) : (
          <View style={styles.rowReceived}>
            <Avatar initials={initialsForRoomName(roomName)} size="mini" />
            <View style={styles.receivedColumn}>
              {bubbleJsx}
              {renderReactions(msg.id, 'left')}
            </View>
          </View>
        )}
      </View>
    );
  };

  /** Distance from window top to top of KAV — equals the SafeAreaView's top inset on iOS. */
  const keyboardVerticalOffset: number = Platform.OS === 'ios' ? insets.top : 0;
  const mainBottomInset = keyboardOpen ? 0 : tabBarHeight;

  return (
    <>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
          enabled={Platform.OS === 'ios'}
        >
          <View
            style={[
              styles.flex,
              {
                backgroundColor: palette.background,
                paddingBottom: mainBottomInset,
              },
            ]}
          >
            <View
              onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
              style={[styles.header, { backgroundColor: palette.card, borderBottomColor: palette.cardBorder }]}
            >
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

            <View style={[styles.flex, styles.minZero]}>
              {!messagesHydrated ? (
                <View style={styles.emptyWrap}>
                  <ActivityIndicator size="large" color={BUBBLE_PURPLE} />
                </View>
              ) : messages.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyBigEmoji}>💬</Text>
                  <ThemedText type="title" style={styles.emptyTitleCenter}>
                    No messages yet
                  </ThemedText>
                  <ThemedText type="body" style={[styles.emptySubtitle, { color: AppColors.muted }]}>
                    Say hello and start playing!
                  </ThemedText>
                  <Pressable
                    onPress={() => void submitContent('Hi! 👋', false)}
                    disabled={isSending}
                    style={({ pressed }) => [
                      styles.sayHiBtn,
                      { backgroundColor: BUBBLE_PURPLE, opacity: pressed ? 0.9 : 1 },
                    ]}
                  >
                    <ThemedText type="cardTitle" style={styles.sayHiBtnText}>
                      Say Hi 👋
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }: ListRenderItemInfo<ChatMessage>) => {
                    const prev = index > 0 ? messages[index - 1] : undefined;
                    return renderMessage(item, prev);
                  }}
                  inverted={false}
                  style={styles.flex}
                  contentContainerStyle={styles.messagesContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                  onLayout={() => {
                    listLayoutReadyRef.current = true;
                    if (pendingScrollRef.current) {
                      pendingScrollRef.current = false;
                      flatListRef.current?.scrollToEnd({ animated: false });
                    }
                  }}
                  onContentSizeChange={() => {
                    if (listLayoutReadyRef.current) {
                      scrollToLatest(false);
                    } else {
                      pendingScrollRef.current = true;
                    }
                  }}
                />
              )}
            </View>

            <View
              style={[
                styles.inputColumn,
                {
                  backgroundColor: palette.card,
                  borderTopColor: palette.cardBorder,
                  paddingBottom: keyboardOpen ? 0 : 8,
                },
              ]}
            >
              {pendingImage ? (
                <View style={[styles.previewRow, { borderBottomColor: palette.cardBorder }]}>
                  <Image source={{ uri: pendingImage.uri }} style={styles.previewThumb} contentFit="cover" />
                  <TouchableOpacity
                    onPress={() => setPendingImage(null)}
                    hitSlop={12}
                    style={styles.previewClose}
                    accessibilityLabel="Remove image"
                  >
                    <MaterialIcons name="close" size={22} color={palette.text} />
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={[styles.composerRow, { borderColor: COMPOSER_BORDER }]}>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: INPUT_FILL, borderColor: COMPOSER_BORDER }]}
                  onPress={() => setShowEmojiSheet(true)}
                  hitSlop={8}
                  accessibilityLabel="Emoji"
                >
                  <Text style={styles.iconBtnEmoji}>😊</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: INPUT_FILL, borderColor: COMPOSER_BORDER }]}
                  onPress={() => void handlePickImage()}
                  hitSlop={8}
                  accessibilityLabel="Photo library"
                >
                  <Text style={styles.iconBtnEmoji}>📷</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: INPUT_FILL, borderColor: COMPOSER_BORDER }]}
                  onPress={() => setShowGamePicker(true)}
                  hitSlop={8}
                  accessibilityLabel="Game challenge"
                >
                  <Text style={styles.iconBtnEmoji}>🎮</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, { backgroundColor: INPUT_FILL, color: palette.text }]}
                  placeholder="Message"
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
                    styles.sendCircle,
                    {
                      backgroundColor: hasSendableContent && !isSending ? SEND_ACTIVE : SEND_DISABLED,
                    },
                  ]}
                  onPress={handleSend}
                  disabled={!hasSendableContent || isSending}
                  activeOpacity={0.75}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialIcons name="arrow-upward" size={22} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

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
              Send a game invite with room code — tap Accept to join.
            </ThemedText>
            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
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
                  <LinearGradient
                    colors={[...game.gradient]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.pickerSwatch}
                  >
                    <Text style={styles.pickerSwatchEmoji}>{game.emoji}</Text>
                  </LinearGradient>
                  <ThemedText type="defaultSemiBold" style={styles.pickerGameName}>
                    {game.name}
                  </ThemedText>
                  <MaterialIcons name="chevron-right" size={22} color={palette.icon} />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setShowGamePicker(false)} style={styles.pickerCancel}>
              <ThemedText style={{ color: palette.icon }}>Cancel</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showEmojiSheet} animationType="fade" transparent>
        <Pressable style={styles.emojiOverlay} onPress={() => setShowEmojiSheet(false)}>
          <Pressable style={[styles.emojiSheet, { backgroundColor: palette.card, borderColor: palette.cardBorder }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.emojiSheetTitle, { color: muted }]}>Tap to add</Text>
            <View style={styles.emojiGrid}>
              {INPUT_EMOJI_SHEET.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => {
                    setInputText((t) => t + e);
                    setShowEmojiSheet(false);
                  }}
                  style={styles.emojiCell}
                >
                  <Text style={styles.emojiCellText}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={reactionPickerForId !== null} animationType="fade" transparent>
        <Pressable style={styles.emojiOverlay} onPress={() => setReactionPickerForId(null)}>
          <Pressable
            style={[styles.reactionPickerBar, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            {REACTION_PICKER_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => reactionPickerForId && appendReaction(reactionPickerForId, emoji)}
                style={styles.reactionPickCell}
              >
                <Text style={styles.reactionPickEmoji}>{emoji}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  minZero: { minHeight: 0 },
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
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  emptyBigEmoji: { fontSize: 72, marginBottom: Spacing.md },
  emptyTitleCenter: { textAlign: 'center', fontWeight: '800', marginBottom: Spacing.sm },
  emptySubtitle: { textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 22 },
  sayHiBtn: {
    minWidth: 220,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: 14,
    alignItems: 'center',
  },
  sayHiBtnText: { color: '#fff', fontWeight: '700' },
  messagesContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  timeDividerWrap: {
    alignItems: 'center',
    marginVertical: 14,
  },
  timeDividerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rowSent: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  sentColumn: {
    maxWidth: '80%',
    alignItems: 'flex-end',
  },
  rowReceived: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
    gap: 8,
  },
  receivedColumn: {
    flex: 1,
    maxWidth: '78%',
    alignItems: 'flex-start',
  },
  bubbleOuter: {
    position: 'relative',
  },
  bubble: {
    maxWidth: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    overflow: 'visible',
  },
  bubbleSentShape: {
    borderBottomRightRadius: 4,
  },
  bubbleReceivedShape: {
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 17,
    lineHeight: 22,
  },
  bubbleTextSent: {
    color: '#fff',
  },
  bubbleTextReceived: {
    color: '#fff',
  },
  inlineImage: {
    width: 220,
    height: 160,
    borderRadius: 14,
    marginBottom: 4,
  },
  imageCaption: {
    marginTop: 4,
  },
  inviteInner: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    minWidth: 240,
  },
  inviteEmoji: {
    fontSize: 36,
    textAlign: 'center',
    marginBottom: 6,
  },
  inviteTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  inviteCode: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  acceptBtn: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  reactionStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    maxWidth: 260,
  },
  reactionStripRight: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  reactionStripLeft: {
    justifyContent: 'flex-start',
  },
  reactionChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  reactionChipText: {
    fontSize: 13,
    color: '#fff',
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  receiptLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  inputColumn: {
    borderTopWidth: 1,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  previewThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  previewClose: {
    marginLeft: 'auto',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    marginHorizontal: 10,
    marginVertical: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderRadius: 26,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnEmoji: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
  },
  sendCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  pickerScroll: { maxHeight: 360 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  pickerSwatch: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerSwatchEmoji: { fontSize: 22 },
  pickerGameName: { flex: 1, fontSize: 16 },
  pickerCancel: { alignItems: 'center', paddingVertical: 12 },
  emojiOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  emojiSheet: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  emojiSheetTitle: {
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  emojiCell: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiCellText: {
    fontSize: 28,
  },
  reactionPickerBar: {
    marginHorizontal: 20,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignSelf: 'center',
  },
  reactionPickCell: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  reactionPickEmoji: {
    fontSize: 28,
  },
});
