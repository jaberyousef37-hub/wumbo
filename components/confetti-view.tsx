import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const COLORS = ['#F687B3', '#F6E05E', '#B794F6', '#68D391', '#FC8181'];
const PARTICLE_COUNT = 40;

function Particle({
  index,
  onComplete,
}: {
  index: number;
  onComplete: () => void;
}) {
  const x = useSharedValue((Math.random() - 0.5) * 100);
  const y = useSharedValue(-20);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);
  const color = COLORS[index % COLORS.length];
  const size = 6 + Math.random() * 6;
  const delay = index * 25;
  const duration = 1800 + Math.random() * 400;

  useEffect(() => {
    y.value = withDelay(
      delay,
      withTiming(700, { duration }, () => {
        opacity.value = withTiming(0, { duration: 400 }, () => {
          runOnJS(onComplete)();
        });
      })
    );
    x.value = withDelay(
      delay,
      withTiming(x.value + (Math.random() - 0.5) * 180, { duration })
    );
    rotation.value = withDelay(
      delay,
      withSequence(
        withTiming(360, { duration: duration / 2 }),
        withTiming(720, { duration: duration / 2 })
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    position: 'absolute',
    left: '50%',
    top: 0,
  }));

  return <Animated.View style={style} />;
}

export function ConfettiView({
  visible,
  onComplete,
}: {
  visible: boolean;
  onComplete: () => void;
}) {
  const [count, setCount] = useState(0);

  const handleParticleComplete = useCallback(() => {
    setCount((c) => {
      const next = c + 1;
      if (next >= PARTICLE_COUNT && onComplete) {
        onComplete();
      }
      return next;
    });
  }, [onComplete]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {[...Array(PARTICLE_COUNT)].map((_, i) => (
        <Particle key={i} index={i} onComplete={handleParticleComplete} />
      ))}
    </View>
  );
}
