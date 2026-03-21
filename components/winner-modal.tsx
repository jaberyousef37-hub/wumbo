import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ConfettiEmoji } from '@/components/confetti-emoji';
import { ConfettiView } from '@/components/confetti-view';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';

type WinnerModalProps = {
  visible: boolean;
  winnerName: string;
  score?: { wins: number; losses: number };
  subtitle?: string;
  onPlayAgain: () => void;
  onConfettiComplete?: () => void;
};

export function WinnerModal({
  visible,
  winnerName,
  score,
  subtitle,
  onPlayAgain,
  onConfettiComplete,
}: WinnerModalProps) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = 0;
      opacity.value = 0;
      scale.value = withDelay(
        300,
        withSequence(
          withSpring(1.1, { damping: 10, stiffness: 200 }),
          withSpring(1)
        )
      );
      opacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    }
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <ConfettiView visible={visible} onComplete={onConfettiComplete ?? (() => {})} />
        <ConfettiEmoji visible={visible} />
        <Animated.View style={[styles.card, cardStyle]}>
          <View style={[styles.cardBorder, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
              <Animated.View style={contentStyle}>
                <Text style={styles.trophy}>🏆</Text>
                <ThemedText style={styles.title}>{winnerName} Wins!</ThemedText>
                {subtitle && (
                  <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
                )}
                {score != null && (
                  <View style={styles.scoreRow}>
                    <View style={styles.scoreItem}>
                      <ThemedText style={styles.scoreValue}>{score.wins}</ThemedText>
                      <ThemedText style={styles.scoreLabel}>Wins</ThemedText>
                    </View>
                    <View style={[styles.scoreDivider, { backgroundColor: palette.cardBorder }]} />
                    <View style={styles.scoreItem}>
                      <ThemedText style={styles.scoreValue}>{score.losses}</ThemedText>
                      <ThemedText style={styles.scoreLabel}>Losses</ThemedText>
                    </View>
                  </View>
                )}
                <Pressable
                  onPress={onPlayAgain}
                  style={styles.playAgainBtn}
                  android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  <LinearGradient
                    colors={[palette.tint, palette.accentPink]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.playAgainGradient}
                  >
                    <Text style={styles.playAgainText}>Play Again</Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginHorizontal: 32,
  },
  cardBorder: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
  },
  trophy: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.9,
    marginBottom: 20,
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(183, 148, 246, 0.2)',
    borderRadius: 16,
  },
  scoreItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 12,
    opacity: 0.9,
    marginTop: 4,
  },
  scoreDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 24,
  },
  playAgainBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  playAgainGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  playAgainText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
