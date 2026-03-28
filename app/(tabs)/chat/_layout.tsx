import { Stack } from 'expo-router';

/** Instagram-style DM: push slides up, pop slides down; iOS uses 300ms system-timed transition. */
const CHAT_ROOM_STACK_OPTIONS = {
  animation: 'slide_from_bottom' as const,
  animationDuration: 300,
  gestureDirection: 'vertical' as const,
  animationMatchesGesture: true,
  fullScreenGestureEnabled: true,
};

export default function ChatLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add-friend" />
      <Stack.Screen name="[id]" options={CHAT_ROOM_STACK_OPTIONS} />
    </Stack>
  );
}
