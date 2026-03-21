/**
 * Notifications — fake data.
 */

export type NotificationType = 'friend_request' | 'game_challenge' | 'message';

export type Notification = {
  id: string;
  type: NotificationType;
  avatar: string;
  text: string;
  time: string;
  unread: boolean;
  actionLabel?: string;
  actionParam?: string; // e.g. room code for game challenge
};

export const FAKE_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'friend_request',
    avatar: 'RC',
    text: 'Riley Chen sent you a friend request',
    time: '2m ago',
    unread: true,
    actionLabel: 'Accept',
  },
  {
    id: 'n2',
    type: 'game_challenge',
    avatar: 'LS',
    text: 'Luna Star challenged you to play Chess! Code: 4832',
    time: '15m ago',
    unread: true,
    actionLabel: 'Join',
    actionParam: '4832',
  },
  {
    id: 'n3',
    type: 'message',
    avatar: 'MP',
    text: 'Max Power: Hey, are you up for UNO?',
    time: '1h ago',
    unread: true,
    actionLabel: 'Reply',
  },
  {
    id: 'n4',
    type: 'friend_request',
    avatar: 'MS',
    text: 'Maya Storm sent you a friend request',
    time: '2h ago',
    unread: false,
    actionLabel: 'Accept',
  },
];
