import { StyleSheet, Text, View } from 'react-native';

import type { RewardBreakdown } from '@/lib/game-rewards';
import { AppColors } from '@/constants/theme';

type Props = {
  rewards: RewardBreakdown;
  compact?: boolean;
};

export function GameResultsSummary({ rewards, compact }: Props) {
  if (rewards.coinsAdded === 0 && rewards.xpAdded === 0) return null;
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.row}>
        <Text style={styles.label}>XP earned</Text>
        <Text style={styles.valueXp}>+{rewards.xpAdded}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Coins earned</Text>
        <Text style={styles.valueCoins}>+{rewards.coinsAdded}</Text>
      </View>
      {rewards.streakBonusApplied ? (
        <Text style={styles.streakHint}>Includes daily streak bonus 🔥</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.35)',
  },
  wrapCompact: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { color: AppColors.muted, fontSize: 14, fontWeight: '600' },
  valueXp: { color: '#A7F3D0', fontSize: 18, fontWeight: '800' },
  valueCoins: { color: '#FDE047', fontSize: 18, fontWeight: '800' },
  streakHint: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', marginTop: 2 },
});
