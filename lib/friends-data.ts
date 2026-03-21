/**
 * Friends data — fake data and types. Replace with Supabase when ready.
 */

export type FriendStatus = 'pending' | 'accepted' | 'declined';

export type Friend = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  online: boolean;
  lastSeen: string;
};

export type FriendRequest = {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar: string;
  status: FriendStatus;
  createdAt: string;
};

// Current user ID for demo (no auth)
export const CURRENT_USER_ID = 'user_yousef';

// Fake friends list
export const FAKE_FRIENDS: Friend[] = [
  { id: 'f1', name: 'Luna Star', username: '@lunastar', avatar: 'LS', online: true, lastSeen: 'Now' },
  { id: 'f2', name: 'Max Power', username: '@maxpower', avatar: 'MP', online: false, lastSeen: '2h ago' },
  { id: 'f3', name: 'Zara Swift', username: '@zaraswift', avatar: 'ZS', online: true, lastSeen: 'Now' },
  { id: 'f4', name: 'Leo Knight', username: '@leoknight', avatar: 'LK', online: false, lastSeen: '1d ago' },
  { id: 'f5', name: 'Aria Bloom', username: '@ariabloom', avatar: 'AB', online: true, lastSeen: '5m ago' },
];

// Fake pending requests (received)
export const FAKE_PENDING_REQUESTS: FriendRequest[] = [
  {
    id: 'req1',
    senderId: 'u_riley',
    senderName: 'Riley Chen',
    senderUsername: '@rileychen',
    senderAvatar: 'RC',
    status: 'pending',
    createdAt: '10m ago',
  },
  {
    id: 'req2',
    senderId: 'u_maya',
    senderName: 'Maya Storm',
    senderUsername: '@mayastorm',
    senderAvatar: 'MS',
    status: 'pending',
    createdAt: '1h ago',
  },
];

// Fake search results
export const FAKE_SEARCH_USERS = [
  { id: 'u_nova', name: 'Nova Sky', username: '@novasky', avatar: 'NS' },
  { id: 'u_echo', name: 'Echo Wave', username: '@echowave', avatar: 'EW' },
  { id: 'u_kai', name: 'Kai Phoenix', username: '@kaiphoenix', avatar: 'KP' },
  { id: 'u_finn', name: 'Finn River', username: '@finnriver', avatar: 'FR' },
];
