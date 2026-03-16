import { Stack } from 'expo-router';

export default function GamesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="game/[id]" />
      <Stack.Screen name="game/[id]/create-room" />
      <Stack.Screen name="game/[id]/join-room" />
    </Stack>
  );
}

