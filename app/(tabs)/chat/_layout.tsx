import { Stack } from 'expo-router';

/** Standard card push (iMessage / WhatsApp–style); avoid modal-style or full-screen swipe transitions. */
const CHAT_THREAD_OPTIONS = {
  animation: 'default' as const,
  gestureDirection: 'horizontal' as const,
  fullScreenGestureEnabled: false,
};

export default function ChatLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add-friend" />
      <Stack.Screen name="[id]" options={CHAT_THREAD_OPTIONS} />
    </Stack>
  );
}
