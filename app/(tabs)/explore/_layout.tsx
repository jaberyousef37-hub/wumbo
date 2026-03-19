import { Stack } from 'expo-router';

export default function ExploreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="tictactoe-details" />
      <Stack.Screen name="lobby" />
      <Stack.Screen name="join-room" />
      <Stack.Screen name="tictactoe" />
      <Stack.Screen name="trivia" />
      <Stack.Screen name="chess" />
      <Stack.Screen name="uno" />
    </Stack>
  );
}
