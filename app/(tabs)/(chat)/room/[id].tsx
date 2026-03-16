import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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

type Message = {
  id: string;
  text: string;
  isMine: boolean;
  senderName?: string;
};

// Fake messages per room (local data only)
const FAKE_MESSAGES: Record<string, Message[]> = {
  '1': [
    { id: 'm1', text: 'Hey everyone!', isMine: false, senderName: 'Jordan' },
    { id: 'm2', text: 'Hi! Ready for game night?', isMine: true },
    { id: 'm3', text: 'Yes! What time?', isMine: false, senderName: 'Sam' },
    { id: 'm4', text: 'How about 7pm?', isMine: false, senderName: 'Jordan' },
    { id: 'm5', text: 'Perfect, see you then 👍', isMine: true },
    { id: 'm6', text: 'See you at the game night!', isMine: false, senderName: 'Alex' },
  ],
  '2': [
    { id: 'm1', text: 'Did you see the new episode?', isMine: false, senderName: 'Alex' },
    { id: 'm2', text: 'Not yet, no spoilers!', isMine: true },
    { id: 'm3', text: 'You\'re gonna love it', isMine: false, senderName: 'Alex' },
    { id: 'm4', text: 'That movie was amazing', isMine: false, senderName: 'Alex' },
    { id: 'm5', text: 'Which one?', isMine: true },
    { id: 'm6', text: 'The one we talked about last week', isMine: false, senderName: 'Alex' },
  ],
  '3': [
    { id: 'm1', text: 'Who\'s online?', isMine: false, senderName: 'Riley' },
    { id: 'm2', text: 'I am!', isMine: true },
    { id: 'm3', text: 'Same here', isMine: false, senderName: 'Jordan' },
    { id: 'm4', text: 'Who\'s down for a round?', isMine: false, senderName: 'Sam' },
    { id: 'm5', text: 'Count me in', isMine: true },
    { id: 'm6', text: 'Let\'s do it 🎮', isMine: false, senderName: 'Riley' },
  ],
};

const ROOM_NAMES: Record<string, string> = {
  '1': 'General',
  '2': 'Friends',
  '3': 'Gaming',
};

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const roomName = id ? ROOM_NAMES[id] ?? 'Chat' : 'Chat';
  const initialMessages = (id && FAKE_MESSAGES[id]) ? FAKE_MESSAGES[id] : [];

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const newMessage: Message = {
      id: `new-${Date.now()}`,
      text: trimmed,
      isMine: true,
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputText('');

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText]);

  if (!id) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ThemedView style={styles.container}>
          <ThemedText>Room not found.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Back</ThemedText>
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            {roomName}
          </ThemedText>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[styles.bubbleRow, msg.isMine ? styles.bubbleRowMine : styles.bubbleRowOther]}
            >
              <View
                style={[
                  styles.bubble,
                  msg.isMine ? styles.bubbleMine : styles.bubbleOther,
                ]}
              >
                {!msg.isMine && msg.senderName && (
                  <ThemedText style={styles.senderName} lightColor={Colors.light.tint} darkColor={Colors.dark.tint}>
                    {msg.senderName}
                  </ThemedText>
                )}
                <ThemedText
                  style={[styles.bubbleText, msg.isMine && styles.bubbleTextMine]}
                >
                  {msg.text}
                </ThemedText>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor={Colors.dark.tabIconDefault}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.sendText}>Send</ThemedText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  keyboard: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  backButton: {
    marginRight: 12,
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 24,
    gap: 10,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: Colors.dark.tint,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleTextMine: {
    color: Colors.dark.text,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.background,
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: Colors.dark.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.dark.text,
  },
  sendButton: {
    backgroundColor: Colors.dark.tint,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 22,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
