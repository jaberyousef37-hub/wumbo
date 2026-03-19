import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const EMOJIS = ['🎉', '🏆', '✨', '🎊', '⭐', '🌟'];
const COUNT = 24;

function EmojiParticle({ index }: { index: number }) {
  const y = useSharedValue(-30);
  const x = useSharedValue((Math.random() - 0.5) * 80);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.5);
  const emoji = EMOJIS[index % EMOJIS.length];
  const delay = index * 40;
  const duration = 2000 + Math.random() * 500;

  useEffect(() => {
    y.value = withDelay(
      delay,
      withTiming(800, { duration })
    );
    x.value = withDelay(
      delay,
      withTiming(x.value + (Math.random() - 0.5) * 120, { duration })
    );
    rotation.value = withDelay(
      delay,
      withSequence(
        withTiming(180, { duration: duration / 2 }),
        withTiming(360, { duration: duration / 2 })
      )
    );
    scale.value = withDelay(delay, withTiming(1, { duration: 200 }));
    opacity.value = withDelay(
      delay + duration - 400,
      withTiming(0, { duration: 400 })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
    position: 'absolute',
    left: '50%',
    top: 0,
  }));

  return (
    <Animated.View style={style}>
      <Text style={styles.emoji}>{emoji}</Text>
    </Animated.View>
  );
}

export function ConfettiEmoji({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {[...Array(COUNT)].map((_, i) => (
        <EmojiParticle key={i} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 28 },
});
