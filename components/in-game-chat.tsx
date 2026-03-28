import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';
import { useCosmeticsOptional } from '@/contexts/cosmetics-context';
import { getChatBubbleTheme } from '@/lib/cosmetics/catalog';

const PANEL_BG = 'rgba(26, 26, 26, 0.96)';

const QUICK_REACTIONS = ['👍', '😂', '🔥', '😮', 'gg', 'wp'] as const;

const QUICK_MESSAGES = [
  'Good luck! 🤞',
  'Nice move! 👏',
  'GG 🏆',
  'Rematch? 🔄',
  'Haha 😂',
  'Nooo! 😭',
] as const;

const OPPONENT_QUIPS = [
  'Good game!',
  'Lucky move 😅',
  "Let's go! 🔥",
  'Nice one!',
  'That was sneaky 😄',
  'Okay okay…',
  'Rematch?',
  'You’re on fire!',
  'Well played!',
  'Got me that round',
] as const;

type ChatMsg = {
  id: string;
  side: 'self' | 'other';
  name: string;
  text: string;
  ts: number;
};

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function initialFromName(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  const ch = t.codePointAt(0);
  if (ch === undefined) return '?';
  return String.fromCodePoint(ch).toUpperCase();
}

export type InGameChatProps = {
  selfName: string;
  opponentName: string;
  /** When true, opponent sends a random line 3–8s after each message you send */
  opponentIsAi?: boolean;
};

export function InGameChat({ selfName, opponentName, opponentIsAi = false }: InGameChatProps) {
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const panelH = Math.round(winH * 0.4);
  const cosmetics = useCosmeticsOptional();
  const bubbleTheme = useMemo(
    () => getChatBubbleTheme(cosmetics?.equipped.chat_color ?? 'chat_default'),
    [cosmetics?.equipped.chat_color],
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);

  const translateY = useSharedValue(panelH);
  const scrollRef = useRef<ScrollView>(null);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];
  }, []);

  useEffect(() => () => clearAllTimeouts(), [clearAllTimeouts]);

  const scheduleAiReply = useCallback(() => {
    if (!opponentIsAi) return;
    const delay = 3000 + Math.random() * 5000;
    const id = setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((x) => x !== id);
      const text = OPPONENT_QUIPS[Math.floor(Math.random() * OPPONENT_QUIPS.length)] ?? 'Nice!';
      setMessages((prev) => [
        ...prev,
        { id: nextId(), side: 'other', name: opponentName, text, ts: Date.now() },
      ]);
    }, delay);
    timeoutIdsRef.current.push(id);
  }, [opponentIsAi, opponentName]);

  const appendSelf = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setMessages((prev) => [...prev, { id: nextId(), side: 'self', name: selfName, text: trimmed, ts: Date.now() }]);
      scheduleAiReply();
    },
    [selfName, scheduleAiReply],
  );

  useLayoutEffect(() => {
    if (!modalVisible) return;
    translateY.value = panelH;
    translateY.value = withTiming(0, { duration: 280 });
  }, [modalVisible, panelH, translateY]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const open = useCallback(() => {
    setModalVisible(true);
  }, []);

  const close = useCallback(() => {
    Keyboard.dismiss();
    translateY.value = withTiming(panelH, { duration: 240 }, (finished) => {
      if (finished) runOnJS(setModalVisible)(false);
    });
  }, [panelH, translateY]);

  useEffect(() => {
    const t = requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(t);
  }, [messages.length]);

  const onSend = useCallback(() => {
    appendSelf(input);
    setInput('');
  }, [input, appendSelf]);

  return (
    <>
      <Pressable onPress={open} style={styles.trigger} hitSlop={10} accessibilityLabel="Open chat">
        <Text style={styles.triggerEmoji}>💬</Text>
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={close}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close chat backdrop" />
          <KeyboardAvoidingView
            style={styles.kav}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={insets.top > 0 ? insets.top : 12}
          >
            <Animated.View style={[styles.panel, { height: panelH, paddingBottom: insets.bottom }, panelStyle]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Chat</Text>
              <Pressable onPress={close} style={styles.closeBtn} hitSlop={12} accessibilityLabel="Close chat">
                <MaterialIcons name="close" size={24} color="#E4E4E7" />
              </Pressable>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.msgScroll}
              contentContainerStyle={styles.msgScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <Text style={styles.empty}>Say hi — quick replies below 👇</Text>
              ) : (
                messages.map((m) => (
                  <View
                    key={m.id}
                    style={[styles.msgRow, m.side === 'self' ? styles.msgRowSelf : styles.msgRowOther]}
                  >
                    {m.side === 'other' && (
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initialFromName(m.name)}</Text>
                      </View>
                    )}
                    <View style={[styles.bubbleCol, m.side === 'self' && styles.bubbleColSelf]}>
                      <Text style={[styles.msgName, m.side === 'self' && styles.msgNameSelf]}>{m.name}</Text>
                      <View
                        style={[
                          styles.bubble,
                          m.side === 'self'
                            ? [styles.bubbleSelf, { backgroundColor: bubbleTheme.self }]
                            : [
                                styles.bubbleOther,
                                {
                                  backgroundColor: bubbleTheme.other,
                                  borderColor: bubbleTheme.otherBorder,
                                },
                              ],
                        ]}
                      >
                        <Text style={styles.msgText}>{m.text}</Text>
                      </View>
                      <Text style={[styles.msgTime, m.side === 'self' && styles.msgTimeSelf]}>{formatTime(m.ts)}</Text>
                    </View>
                    {m.side === 'self' && (
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initialFromName(m.name)}</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reactionsRow}>
              {QUICK_REACTIONS.map((r) => (
                <Pressable key={r} style={styles.reactionChip} onPress={() => appendSelf(r)}>
                  <Text style={styles.reactionChipText}>{r}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickMsgRow}>
              {QUICK_MESSAGES.map((q) => (
                <Pressable key={q} style={styles.quickMsgChip} onPress={() => appendSelf(q)}>
                  <Text style={styles.quickMsgText} numberOfLines={1}>
                    {q}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Message…"
                placeholderTextColor={AppColors.muted}
                returnKeyType="send"
                onSubmitEditing={onSend}
                blurOnSubmit={false}
                maxLength={500}
              />
              <Pressable
                onPress={onSend}
                style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
                disabled={!input.trim()}
              >
                <MaterialIcons name="send" size={22} color="#fff" />
              </Pressable>
            </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerEmoji: {
    fontSize: 22,
  },
  modalRoot: {
    flex: 1,
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  panel: {
    backgroundColor: PANEL_BG,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  panelTitle: {
    color: '#FAFAFA',
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: { padding: 4 },
  msgScroll: { flex: 1, minHeight: 80 },
  msgScrollContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  empty: {
    color: AppColors.muted,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '100%',
  },
  msgRowSelf: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3f3f46',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  avatarText: { color: '#F4F4F5', fontWeight: '800', fontSize: 14 },
  bubbleCol: { maxWidth: '78%' },
  bubbleColSelf: { alignItems: 'flex-end' },
  msgName: {
    color: AppColors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    marginHorizontal: 4,
  },
  msgNameSelf: { alignSelf: 'flex-end', textAlign: 'right' },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleSelf: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  msgText: { color: '#FAFAFA', fontSize: 15, lineHeight: 20, fontWeight: '600' },
  msgTime: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    marginHorizontal: 4,
  },
  msgTimeSelf: { alignSelf: 'flex-end', textAlign: 'right' },
  reactionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  reactionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  reactionChipText: { fontSize: 16 },
  quickMsgRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  quickMsgChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
    maxWidth: 200,
  },
  quickMsgText: { color: '#E9D5FF', fontSize: 13, fontWeight: '700' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '600',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: AppColors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.38,
  },
});
