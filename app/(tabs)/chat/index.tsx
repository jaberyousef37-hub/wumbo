import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BaseCard } from '@/components/base-card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts/theme-context';
import { AppColors, Colors } from '@/constants/theme';
import { SECTION_GAP, SCREEN_PADDING, Spacing } from '@/constants/spacing';
import { FAKE_FRIENDS, type Friend, type FriendRequest } from '@/lib/friends-data';
import { CHALLENGE_GAME_PICKS } from '@/lib/challenge-games';
import { generateRoomCode } from '@/lib/room-utils';
import { ICON_SIZE_CARD, ICON_SIZE_NAV } from '@/constants/typography';

/** Chat list — premium purple accents (list screen only) */
const PURPLE_MUTED = 'rgba(124, 58, 237, 0.14)';
const PURPLE_RING = 'rgba(124, 58, 237, 0.5)';
const PURPLE_SOFT = 'rgba(124, 58, 237, 0.22)';
const PURPLE_TAB_ACTIVE = 'rgba(124, 58, 237, 0.38)';

const CONVERSATIONS: {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isGameInvite: boolean;
}[] = [
  {
    id: 'mock_dm_1',
    name: 'Nova Sky',
    lastMessage: 'gg ez 😂 rematch?',
    timestamp: '2m ago',
    unreadCount: 2,
    isGameInvite: false,
  },
  {
    id: 'mock_dm_2',
    name: 'Kai Phoenix',
    lastMessage: '🎮 Game invite: Tic Tac Toe',
    timestamp: '14m ago',
    unreadCount: 0,
    isGameInvite: true,
  },
  {
    id: 'mock_dm_3',
    name: 'Echo Wave',
    lastMessage: 'you around tonight?',
    timestamp: 'Yesterday',
    unreadCount: 0,
    isGameInvite: false,
  },
];

type Tab = 'chats' | 'friends';

function ChatRoomCard({
  room,
}: {
  room: (typeof CONVERSATIONS)[0];
}) {
  const router = useRouter();
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.listCardWrap}>
      <BaseCard
        onPress={() => router.push(`/(tabs)/chat/${room.id}`)}
        showChevron
        style={styles.listCardInner}
      >
        <View style={styles.roomRow}>
          <View style={styles.avatarRing}>
            <Avatar initials={room.name} size="medium" />
          </View>
          <View style={styles.roomMain}>
            <View style={styles.roomTop}>
              <View style={styles.nameBlock}>
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
                </View>
              </View>
              <View style={styles.roomMetaCol}>
                <Text style={[styles.timestamp, { color: AppColors.textSecondary }]}>{room.timestamp}</Text>
                {room.unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {room.unreadCount > 99 ? '99+' : room.unreadCount}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </BaseCard>
    </View>
  );
}

function FriendCard({
  friend,
  onPress,
}: {
  friend: Friend;
  onPress: () => void;
}) {
  const { isDark } = useTheme();
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.listCardWrap}>
      <BaseCard onPress={onPress} showChevron style={styles.listCardInner}>
        <View style={styles.friendRow}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarRing}>
              <Avatar initials={friend.avatar} size="medium" />
            </View>
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
    </View>
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
    <View style={styles.listCardWrap}>
      <BaseCard style={styles.listCardInner}>
        <View style={styles.requestRow}>
          <View style={styles.avatarRing}>
            <Avatar initials={request.senderAvatar} size="medium" />
          </View>
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
    </View>
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
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showFriendOptions, setShowFriendOptions] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeRecipient, setChallengeRecipient] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
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
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['bottom', 'left', 'right']}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
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

        {/* Tabs — segmented control */}
        <View style={styles.tabSegmentWrap}>
          <View style={[styles.tabSegment, { backgroundColor: PURPLE_MUTED }]}>
            <Pressable
              onPress={() => setActiveTab('chats')}
              style={({ pressed }) => [
                styles.tabSegmentBtn,
                activeTab === 'chats' && [styles.tabSegmentBtnActive, { backgroundColor: PURPLE_TAB_ACTIVE }],
                pressed && styles.tabSegmentPressed,
              ]}
            >
              <Text
                style={[
                  styles.tabSegmentLabel,
                  { color: activeTab === 'chats' ? '#FFFFFF' : AppColors.textSecondary },
                ]}
              >
                Chats
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('friends')}
              style={({ pressed }) => [
                styles.tabSegmentBtn,
                activeTab === 'friends' && [styles.tabSegmentBtnActive, { backgroundColor: PURPLE_TAB_ACTIVE }],
                pressed && styles.tabSegmentPressed,
              ]}
            >
              <View style={styles.tabSegmentLabelRow}>
                <Text
                  style={[
                    styles.tabSegmentLabel,
                    { color: activeTab === 'friends' ? '#FFFFFF' : AppColors.textSecondary },
                  ]}
                >
                  Friends
                </Text>
                {pendingRequests.length > 0 && (
                  <View style={styles.tabSegmentPill}>
                    <Text style={styles.tabSegmentPillText}>{pendingRequests.length}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          </View>
        </View>

        {activeTab === 'chats' ? (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {CONVERSATIONS.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <ThemedText type="title" style={styles.emptyTitle}>
                  No messages yet
                </ThemedText>
                <ThemedText type="body" style={[styles.emptySub, { color: palette.icon }]}>
                  Say hello and start playing!
                </ThemedText>
                <Pressable
                  onPress={() => router.push('/(tabs)/chat/add-friend')}
                  style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.9 }]}
                >
                  <ThemedText type="cardTitle" style={styles.emptyCtaText}>
                    Say Hi 👋
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              CONVERSATIONS.map((room) => <ChatRoomCard key={room.id} room={room} />)
            )}
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
              {FAKE_FRIENDS.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyEmoji}>👥</Text>
                  <ThemedText type="title" style={styles.emptyTitle}>
                    No friends yet
                  </ThemedText>
                  <ThemedText type="body" style={[styles.emptySub, { color: palette.icon }]}>
                    Find people to chat and challenge.
                  </ThemedText>
                  <Pressable
                    onPress={() => router.push('/(tabs)/chat/add-friend')}
                    style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.9 }]}
                  >
                    <ThemedText type="cardTitle" style={styles.emptyCtaText}>
                      Find players
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                FAKE_FRIENDS.map((friend) => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    onPress={() => {
                      setSelectedFriend(friend);
                      setShowFriendOptions(true);
                    }}
                  />
                ))
              )}
            </View>
          </ScrollView>
        )}
      </View>

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
  tabSegmentWrap: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
  },
  tabSegment: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabSegmentBtn: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: Spacing.sm,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSegmentBtnActive: {},
  tabSegmentPressed: { opacity: 0.92 },
  tabSegmentLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tabSegmentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabSegmentPill: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSegmentPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  listCardWrap: {
    marginBottom: Spacing.xs,
  },
  listCardInner: {
    borderColor: 'rgba(124, 58, 237, 0.18)',
  },
  avatarRing: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: PURPLE_RING,
    backgroundColor: 'rgba(124, 58, 237, 0.07)',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  section: { marginBottom: SECTION_GAP },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    opacity: 0.85,
    marginBottom: Spacing.sm,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: Spacing.md,
  },
  roomMain: { flex: 1, minWidth: 0 },
  roomTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
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
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: PURPLE_SOFT,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124, 58, 237, 0.35)',
  },
  gameBadgeEmoji: { fontSize: 12 },
  timestamp: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.15,
    textAlign: 'right',
  },
  roomMetaCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 8,
    minWidth: 76,
    paddingTop: 2,
  },
  nameBlock: { flex: 1, minWidth: 0 },
  roomBottom: {
    marginTop: 4,
  },
  lastMessage: { flex: 1 },
  lastMessageUnread: { fontWeight: '700' },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.tint,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
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
  friendMain: { flex: 1, marginLeft: Spacing.md },
  friendName: { fontSize: 16, marginBottom: 2 },
  friendMeta: { fontSize: 14 },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestInfo: { flex: 1, marginLeft: Spacing.md },
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
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.lg + Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.xs },
  emptyTitle: { textAlign: 'center', fontWeight: '800' },
  emptySub: { textAlign: 'center', lineHeight: 22 },
  emptyCta: {
    marginTop: Spacing.md,
    backgroundColor: AppColors.tint,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    minWidth: 200,
    alignItems: 'center',
  },
  emptyCtaText: { color: '#fff', fontWeight: '700' },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.sm,
    fontSize: 16,
  },
});
