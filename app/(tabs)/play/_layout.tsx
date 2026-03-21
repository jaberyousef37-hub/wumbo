import { Stack } from 'expo-router';

export default function PlayLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="tictactoe-details" />
      <Stack.Screen name="create-room" />
      <Stack.Screen name="lobby" />
      <Stack.Screen name="join-room" />
      <Stack.Screen name="tictactoe" />
      <Stack.Screen name="trivia" />
      <Stack.Screen name="chess" />
      <Stack.Screen name="uno" />
      <Stack.Screen name="snake" />
      <Stack.Screen name="shell-game" />
      <Stack.Screen name="shell-game-join" />
      <Stack.Screen name="shell-game-play" />
    </Stack>
  );
}
