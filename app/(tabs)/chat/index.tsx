import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BaseCard } from '@/components/base-card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import {
  CARD_GAP,
  SECTION_GAP,
  SCREEN_PADDING,
  Spacing,
} from '@/constants/spacing';
import {
  FAKE_FRIENDS,
  FAKE_PENDING_REQUESTS,
  type Friend,
  type FriendRequest,
} from '@/lib/friends-data';
import { CHALLENGE_GAME_PICKS } from '@/lib/challenge-games';
import { generateRoomCode } from '@/lib/room-utils';
import { ICON_SIZE_CARD, ICON_SIZE_NAV } from '@/constants/typography';

const CONVERSATIONS = [
  {
    id: '1',
    name: 'Alex Rivera',
    lastMessage: 'Trivia rematch tonight?',
    timestamp: '2m ago',
    unreadCount: 3,
    isGameInvite: true,
  },
  {
    id: '2',
    name: 'Sam Okonkwo',
    lastMessage: 'Room code 9174 — I’m in!',
    timestamp: '1h ago',
    unreadCount: 0,
    isGameInvite: true,
  },
  {
    id: '3',
    name: 'Jordan & Riley',
    lastMessage: "Who's down for UNO?",
    timestamp: '5m ago',
    unreadCount: 12,
    isGameInvite: true,
  },
];

type Tab = 'chats' | 'friends';

function ChatRoomCard({
  room,
  index,
}: {
  room: (typeof CONVERSATIONS)[0];
  index: number;
}) {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify().damping(16)}>
      <BaseCard
        onPress={() => router.push(`/(tabs)/chat/${room.id}`)}
        showChevron
      >
        <View style={styles.roomRow}>
          <Avatar initials={room.name} size="medium" />
          <View style={styles.roomMain}>
            <View style={styles.roomTop}>
              <View style={styles.nameRow}>
                <ThemedText type="defaultSemiBold" style={styles.roomName} numberOfLines={1}>
                  {room.name}
                </ThemedText>
                {room.isGameInvite && (
                  <View style={styles.gameBadge} accessibilityLabel="Game invite">
                    <ThemedText style={styles.gameBadgeEmoji}>🎮</ThemedText>
                  </View>
                )}
              </View>
              <ThemedText
                type="caption"
                style={styles.timestamp}
                lightColor={Colors.light.icon}
                darkColor={Colors.dark.icon}
              >
                {room.timestamp}
              </ThemedText>
            </View>
            <View style={styles.roomBottom}>
              <ThemedText
                type="body"
                style={[
                  styles.lastMessage,
                  { color: palette.text },
                  room.unreadCount > 0 && styles.lastMessageUnread,
                ]}
                numberOfLines={1}
              >
                {room.lastMessage}
              </ThemedText>
              {room.unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: 'rgba(124, 58, 237, 0.25)' }]}>
                  <ThemedText type="caption" style={styles.badgeText}>
                    {room.unreadCount > 99 ? '99+' : room.unreadCount}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>
      </BaseCard>
    </Animated.View>
  );
}

function FriendCard({
  friend,
  index,
  onPress,
}: {
  friend: Friend;
  index: number;
  onPress: () => void;
}) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(16)}>
      <BaseCard onPress={onPress} showChevron>
        <View style={styles.friendRow}>
          <View style={styles.avatarWrap}>
            <Avatar initials={friend.avatar} size="medium" />
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: friend.online ? '#48BB78' : '#9CA3AF',
                  borderColor: palette.card,
                },
              ]}
            />
          </View>
          <View style={styles.friendMain}>
            <ThemedText type="defaultSemiBold" style={styles.friendName}>
              {friend.name}
            </ThemedText>
            <ThemedText
              style={[styles.friendMeta, { color: palette.icon }]}
            >
              {friend.online ? 'Online' : `Last seen ${friend.lastSeen}`}
            </ThemedText>
          </View>
        </View>
      </BaseCard>
    </Animated.View>
  );
}

function FriendRequestCard({
  request,
  onAccept,
  onDecline,
}: {
  request: FriendRequest;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <BaseCard>
      <View style={styles.requestRow}>
        <Avatar initials={request.senderAvatar} size="medium" />
        <View style={styles.requestInfo}>
          <ThemedText type="defaultSemiBold" style={styles.requestName}>
            {request.senderName}
          </ThemedText>
          <ThemedText style={[styles.requestUsername, { color: palette.icon }]}>
            {request.senderUsername}
          </ThemedText>
        </View>
        <View style={styles.requestActions}>
          <Pressable
            onPress={onAccept}
            style={({ pressed }) => [
              styles.requestBtn,
              styles.acceptBtn,
              { backgroundColor: palette.tint },
              pressed && styles.requestBtnPressed,
            ]}
          >
            <ThemedText style={styles.acceptBtnText}>Accept</ThemedText>
          </Pressable>
          <Pressable
            onPress={onDecline}
            style={({ pressed }) => [
              styles.requestBtn,
              { borderColor: palette.cardBorder, borderWidth: 1 },
              pressed && styles.requestBtnPressed,
            ]}
          >
            <ThemedText style={{ color: palette.icon, fontSize: 14, fontWeight: '600' }}>
              Decline
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </BaseCard>
  );
}

function FriendOptionsModal({
  visible,
  friend,
  onClose,
  onSendMessage,
  onChallenge,
  onViewProfile,
}: {
  visible: boolean;
  friend: Friend | null;
  onClose: () => void;
  onSendMessage: () => void;
  onChallenge: () => void;
  onViewProfile: () => void;
}) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  if (!friend) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.optionsContent, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.optionsHeader}>
            <Avatar initials={friend.avatar} size="large" />
            <ThemedText type="defaultSemiBold" style={styles.optionsName}>
              {friend.name}
            </ThemedText>
            <ThemedText style={[styles.optionsUsername, { color: palette.icon }]}>
              {friend.username}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => { onSendMessage(); onClose(); }}
            style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
          >
            <MaterialIcons name="message" size={ICON_SIZE_NAV} color={palette.tint} />
            <ThemedText type="body" style={styles.optionLabel}>
              Send Message
            </ThemedText>
            <MaterialIcons name="chevron-right" size={ICON_SIZE_NAV} color={palette.icon} />
          </Pressable>
          <Pressable
            onPress={() => { onChallenge(); onClose(); }}
            style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
          >
            <MaterialIcons name="sports-esports" size={ICON_SIZE_NAV} color={palette.tint} />
            <ThemedText type="body" style={styles.optionLabel}>
              Challenge to Game
            </ThemedText>
            <MaterialIcons name="chevron-right" size={ICON_SIZE_NAV} color={palette.icon} />
          </Pressable>
          <Pressable
            onPress={() => { onViewProfile(); onClose(); }}
            style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
          >
            <MaterialIcons name="person" size={ICON_SIZE_NAV} color={palette.tint} />
            <ThemedText type="body" style={styles.optionLabel}>
              View Profile
            </ThemedText>
            <MaterialIcons name="chevron-right" size={ICON_SIZE_NAV} color={palette.icon} />
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <ThemedText style={[styles.cancelBtnText, { color: palette.icon }]}>
              Cancel
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ChallengeGameModal({
  visible,
  recipientName,
  onClose,
  onPickGame,
}: {
  visible: boolean;
  recipientName: string;
  onClose: () => void;
  onPickGame: (gameType: string) => void;
}) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  if (!recipientName) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.challengeContent, { backgroundColor: palette.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.challengeHeader}>
            <ThemedText type="title" style={styles.challengeTitle}>
              Challenge {recipientName}
            </ThemedText>
            <ThemedText
              style={[styles.challengeSubtitle, { color: palette.icon }]}
            >
              Pick a game — we&apos;ll open a room and you can drop the code in chat.
            </ThemedText>
          </View>
          {CHALLENGE_GAME_PICKS.map((game) => (
            <Pressable
              key={game.id}
              onPress={() => onPickGame(game.id)}
              style={({ pressed }) => [
                styles.gameOption,
                { backgroundColor: palette.card, borderColor: palette.cardBorder },
                pressed && styles.gameOptionPressed,
              ]}
            >
              <ThemedText style={styles.gameEmoji}>{game.emoji}</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.gameName}>
                {game.name}
              </ThemedText>
              <MaterialIcons name="chevron-right" size={ICON_SIZE_NAV} color={palette.icon} />
            </Pressable>
          ))}
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <ThemedText style={[styles.cancelBtnText, { color: palette.icon }]}>
              Cancel
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showFriendOptions, setShowFriendOptions] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeRecipient, setChallengeRecipient] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState(FAKE_PENDING_REQUESTS);
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  const handleAcceptRequest = (id: string) => {
    setPendingRequests((r) => r.filter((req) => req.id !== id));
  };

  const handleDeclineRequest = (id: string) => {
    setPendingRequests((r) => r.filter((req) => req.id !== id));
  };

  const handleChallengeGame = (gameType: string) => {
    const code = generateRoomCode();
    const name = challengeRecipient ?? '';
    setShowChallengeModal(false);
    setChallengeRecipient(null);
    setSelectedFriend(null);
    router.push({
      pathname: '/(tabs)/play/create-room',
      params: {
        challengeGame: gameType,
        challengeCode: code,
        challengeFriend: name || undefined,
      },
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitles}>
            <ThemedText type="title" style={styles.headerTitle}>
              Chat
            </ThemedText>
            <ThemedText
              type="caption"
              style={[styles.headerTagline, { color: palette.icon }]}
              numberOfLines={2}
            >
              Message friends and drop game challenges — party energy, one thread.
            </ThemedText>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push('/(tabs)/chat/add-friend')}
              style={({ pressed }) => [styles.headerAction, pressed && { opacity: 0.85 }]}
              accessibilityLabel="Add friend"
            >
              <MaterialIcons name="person" size={ICON_SIZE_NAV} color={palette.text} />
              <ThemedText type="caption" style={[styles.headerActionLabel, { color: palette.icon }]}>
                Add Friend
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/play/create-room')}
              style={({ pressed }) => [styles.headerAction, pressed && { opacity: 0.85 }]}
              accessibilityLabel="New game"
            >
              <MaterialIcons name="sports-esports" size={ICON_SIZE_NAV} color={palette.text} />
              <ThemedText type="caption" style={[styles.headerActionLabel, { color: palette.icon }]}>
                New Game
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabRow, { borderColor: palette.cardBorder }]}>
          <Pressable
            onPress={() => setActiveTab('chats')}
            style={[
              styles.tab,
              activeTab === 'chats' && { borderBottomColor: palette.tint, borderBottomWidth: 2 },
            ]}
          >
            <ThemedText
              style={[
                styles.tabLabel,
                activeTab === 'chats' && { color: palette.tint, fontWeight: '700' },
              ]}
            >
              Chats
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('friends')}
            style={[
              styles.tab,
              activeTab === 'friends' && { borderBottomColor: palette.tint, borderBottomWidth: 2 },
            ]}
          >
            <ThemedText
              style={[
                styles.tabLabel,
                activeTab === 'friends' && { color: palette.tint, fontWeight: '700' },
              ]}
            >
              Friends
            </ThemedText>
            {pendingRequests.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: palette.accentPink }]}>
                <ThemedText style={styles.tabBadgeText}>
                  {pendingRequests.length}
                </ThemedText>
              </View>
            )}
          </Pressable>
        </View>

        {activeTab === 'chats' ? (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {CONVERSATIONS.map((room, index) => (
              <ChatRoomCard key={room.id} room={room} index={index} />
            ))}
          </ScrollView>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {pendingRequests.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Friend Requests
                </ThemedText>
                {pendingRequests.map((req) => (
                  <FriendRequestCard
                    key={req.id}
                    request={req}
                    onAccept={() => handleAcceptRequest(req.id)}
                    onDecline={() => handleDeclineRequest(req.id)}
                  />
                ))}
              </View>
            )}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Friends
                </ThemedText>
                <Pressable
                  onPress={() => router.push('/(tabs)/chat/add-friend')}
                  style={({ pressed }) => [
                    styles.addFriendBtn,
                    { borderColor: palette.tint },
                    pressed && styles.addFriendBtnPressed,
                  ]}
                >
                  <MaterialIcons name="person-add" size={ICON_SIZE_CARD} color={palette.tint} />
                  <ThemedText style={[styles.addFriendBtnText, { color: palette.tint }]}>
                    Add Friend
                  </ThemedText>
                </Pressable>
              </View>
              {FAKE_FRIENDS.map((friend, index) => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  index={index}
                  onPress={() => {
                    setSelectedFriend(friend);
                    setShowFriendOptions(true);
                  }}
                />
              ))}
            </View>
          </ScrollView>
        )}
      </Animated.View>

      <FriendOptionsModal
        visible={showFriendOptions}
        friend={selectedFriend}
        onClose={() => {
          setShowFriendOptions(false);
          setSelectedFriend(null);
        }}
        onSendMessage={() => router.push(`/(tabs)/chat/${selectedFriend?.id ?? '1'}`)}
        onChallenge={() => {
          if (selectedFriend) setChallengeRecipient(selectedFriend.name);
          setShowFriendOptions(false);
          setShowChallengeModal(true);
        }}
        onViewProfile={() => router.push('/(tabs)/profile')}
      />

      <ChallengeGameModal
        visible={showChallengeModal && !!challengeRecipient}
        recipientName={challengeRecipient ?? ''}
        onClose={() => {
          setShowChallengeModal(false);
          setChallengeRecipient(null);
          setSelectedFriend(null);
        }}
        onPickGame={handleChallengeGame}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  headerTitles: { flex: 1, minWidth: 0, marginRight: Spacing.xs },
  headerTitle: { fontWeight: '800' },
  headerTagline: { marginTop: 4, lineHeight: 16 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.md,
  },
  headerAction: { alignItems: 'center', minWidth: 64 },
  headerActionLabel: { marginTop: 4, textAlign: 'center' },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: -1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tabLabel: { fontSize: 16 },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.md,
    gap: CARD_GAP,
  },
  section: { marginBottom: SECTION_GAP },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: 16, marginBottom: Spacing.sm },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.xs,
  },
  roomMain: { flex: 1, marginLeft: Spacing.sm, minWidth: 0 },
  roomTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  nameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  roomName: { flexShrink: 1 },
  gameBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.22)',
  },
  gameBadgeEmoji: { fontSize: 12 },
  timestamp: {},
  roomBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  lastMessage: { flex: 1 },
  lastMessageUnread: { fontWeight: '700' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontWeight: '600', color: '#7C3AED' },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: { position: 'relative' },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  friendMain: { flex: 1, marginLeft: Spacing.sm },
  friendName: { fontSize: 16, marginBottom: 2 },
  friendMeta: { fontSize: 14 },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestInfo: { flex: 1, marginLeft: Spacing.sm },
  requestName: { fontSize: 16, marginBottom: 2 },
  requestUsername: { fontSize: 14 },
  requestActions: { flexDirection: 'row', gap: Spacing.xs },
  requestBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: 10,
  },
  acceptBtn: {},
  acceptBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  requestBtnPressed: { opacity: 0.9 },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: 10,
    borderWidth: 2,
  },
  addFriendBtnPressed: { opacity: 0.9 },
  addFriendBtnText: { fontSize: 14, fontWeight: '600' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  optionRowPressed: { opacity: 0.9 },
  optionLabel: { flex: 1, fontSize: 16 },
  optionsContent: {
    marginHorizontal: Spacing.md,
    marginTop: 'auto',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  optionsHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  optionsName: { fontSize: 20, marginTop: Spacing.sm },
  optionsUsername: { fontSize: 14, marginTop: Spacing.xs },
  challengeContent: {
    marginHorizontal: Spacing.md,
    marginTop: 'auto',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
  },
  challengeHeader: { marginBottom: Spacing.md },
  challengeTitle: { fontSize: 22, marginBottom: Spacing.xs },
  challengeSubtitle: { fontSize: 15 },
  gameOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  gameOptionPressed: { opacity: 0.9 },
  gameEmoji: { fontSize: 24 },
  gameName: { flex: 1, fontSize: 16 },
  cancelBtn: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  cancelBtnText: { fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    maxHeight: '55%',
    minHeight: 260,
  },
  newConvColumn: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 220,
  },
  modalBodySpacer: {
    flex: 1,
    minHeight: Spacing.md,
  },
  modalInputFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalTitle: { fontSize: 24 },
  modalClose: { padding: Spacing.xs },
  notifPanel: {
    marginTop: '20%',
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SCREEN_PADDING,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SCREEN_PADDING,
  },
  notifTitle: { fontSize: 22 },
  notifScroll: { flex: 1 },
  notifScrollContent: { paddingBottom: SCREEN_PADDING * 2, gap: Spacing.sm },
  notifItem: {
    flexDirection: 'row',
    padding: SCREEN_PADDING,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  notifContent: { flex: 1 },
  notifText: { fontSize: 15, marginBottom: 4 },
  notifTime: { fontSize: 13, marginBottom: Spacing.sm },
  notifActionBtn: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: 10,
  },
  notifActionBtnPressed: { opacity: 0.9 },
  notifActionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  notifEmpty: { textAlign: 'center', marginTop: Spacing.lg, fontSize: 16 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.sm,
    fontSize: 16,
  },
});
