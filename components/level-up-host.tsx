import { useCosmetics } from '@/contexts/cosmetics-context';

import { LevelUpModal } from '@/components/level-up-modal';

export function LevelUpHost() {
  const { pendingLevelUp, dismissLevelUp } = useCosmetics();
  return (
    <LevelUpModal
      visible={pendingLevelUp != null}
      level={pendingLevelUp ?? 1}
      onDismiss={dismissLevelUp}
    />
  );
}
