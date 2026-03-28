import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppColors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import { useCosmetics, type CosmeticKind } from '@/contexts/cosmetics-context';
import { COSMETIC_ITEMS, type CosmeticItem } from '@/lib/cosmetics/catalog';

const CATEGORIES: { key: CosmeticKind; label: string }[] = [
  { key: 'avatar', label: 'Avatars' },
  { key: 'uno_skin', label: 'Card Skins' },
  { key: 'chess_theme', label: 'Chess Themes' },
  { key: 'profile_frame', label: 'Frames' },
  { key: 'chat_color', label: 'Chat Colors' },
];

export default function ShopScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { coins, isOwned, isEquipped, buyItem, equipItem } = useCosmetics();
  const [active, setActive] = useState<CosmeticKind>('avatar');

  const items = useMemo(
    () => COSMETIC_ITEMS.filter((i) => i.kind === active),
    [active],
  );

  const gap = 10;
  const pad = Spacing.sm;
  const colW = (width - pad * 2 - gap) / 2;

  const onBuy = useCallback(
    (item: CosmeticItem) => {
      if (isOwned(item.id)) {
        equipItem(item.id);
        return;
      }
      const ok = buyItem(item.id);
      if (ok) equipItem(item.id);
    },
    [buyItem, equipItem, isOwned],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={24} color={AppColors.text} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>
          Shop
        </ThemedText>
        <View style={styles.coinPill}>
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.coinAmt}>{coins}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {CATEGORIES.map((c) => (
          <Pressable
            key={c.key}
            onPress={() => setActive(c.key)}
            style={[styles.catChip, active === c.key && styles.catChipOn]}
          >
            <Text style={[styles.catChipText, active === c.key && styles.catChipTextOn]}>
              {c.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.grid, { paddingHorizontal: pad, paddingBottom: Spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gridInner}>
          {items.map((item) => {
            const owned = isOwned(item.id);
            const eq = isEquipped(item.id);
            const canBuy = !owned && coins >= item.price;

            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  { width: colW },
                  eq && styles.cardEquipped,
                ]}
              >
                <View style={styles.previewBox}>
                  <Text style={styles.previewEmoji}>{item.preview}</Text>
                  {owned && (
                    <View style={styles.ownedBadge}>
                      <MaterialIcons name="check-circle" size={18} color="#22C55E" />
                    </View>
                  )}
                </View>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.priceLine}>
                  {item.price === 0 ? 'Free' : `${item.price} 🪙`}
                </Text>
                {!owned ? (
                  <Pressable
                    onPress={() => onBuy(item)}
                    disabled={!canBuy}
                    style={({ pressed }) => [
                      styles.buyBtn,
                      !canBuy && styles.buyBtnDisabled,
                      pressed && canBuy && styles.pressed,
                    ]}
                  >
                    <Text style={styles.buyBtnText}>
                      {canBuy ? `Buy ${item.price} 🪙` : 'Not enough 🪙'}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => equipItem(item.id)}
                    style={({ pressed }) => [styles.equipBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.equipBtnText}>{eq ? 'Equipped' : 'Equip'}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontWeight: '800' },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppColors.card,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  coinEmoji: { fontSize: 18 },
  coinAmt: { color: '#FBBF24', fontWeight: '900', fontSize: 16 },
  catRow: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: AppColors.card,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    marginRight: 8,
  },
  catChipOn: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderColor: AppColors.tint,
  },
  catChipText: { color: AppColors.muted, fontWeight: '700', fontSize: 14 },
  catChipTextOn: { color: '#E9D5FF' },
  grid: { flexGrow: 1 },
  gridInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: AppColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    padding: 12,
    marginBottom: 4,
  },
  cardEquipped: {
    borderColor: AppColors.tint,
    borderWidth: 2,
    shadowColor: AppColors.tint,
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  previewBox: {
    height: 72,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  previewEmoji: { fontSize: 36 },
  ownedBadge: { position: 'absolute', top: 6, right: 6 },
  itemName: {
    color: AppColors.text,
    fontWeight: '800',
    fontSize: 15,
    minHeight: 40,
  },
  priceLine: {
    color: '#FBBF24',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 10,
  },
  buyBtn: {
    backgroundColor: AppColors.tint,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  buyBtnDisabled: {
    opacity: 0.45,
  },
  buyBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  equipBtn: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.45)',
  },
  equipBtnText: { color: '#DDD6FE', fontWeight: '800', fontSize: 14 },
  pressed: { opacity: 0.9 },
});
