import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { AppColors } from '@/constants/theme';

type Props = {
  visible: boolean;
  level: number;
  onDismiss: () => void;
};

export function LevelUpModal({ visible, level, onDismiss }: Props) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!visible) return;
    pulse.value = 1;
    pulse.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 420 }), withTiming(1, { duration: 420 })),
      -1,
      true,
    );
  }, [visible, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Animated.View style={[styles.ring, ringStyle]}>
            <Text style={styles.emoji}>⭐</Text>
            <Text style={styles.title}>Level Up!</Text>
            <Text style={styles.level}>Level {level}</Text>
          </Animated.View>
          <Text style={styles.sub}>Keep playing to earn more XP and coins.</Text>
          <Pressable onPress={onDismiss} style={styles.btn}>
            <Text style={styles.btnText}>Awesome</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1a1428',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AppColors.tint,
    maxWidth: 340,
    width: '100%',
  },
  ring: {
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  level: {
    color: AppColors.tint,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  sub: {
    color: AppColors.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: AppColors.tint,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
