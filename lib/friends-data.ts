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

// Fake friends list (empty — shows Friends tab empty state; replace with API data later)
export const FAKE_FRIENDS: Friend[] = [];

/** @deprecated use local state; kept for typing */
export const FAKE_PENDING_REQUESTS: FriendRequest[] = [];

// Fake search results
export const FAKE_SEARCH_USERS = [
  { id: 'u_nova', name: 'Nova Sky', username: '@novasky', avatar: 'NS' },
  { id: 'u_echo', name: 'Echo Wave', username: '@echowave', avatar: 'EW' },
  { id: 'u_kai', name: 'Kai Phoenix', username: '@kaiphoenix', avatar: 'KP' },
  { id: 'u_finn', name: 'Finn River', username: '@finnriver', avatar: 'FR' },
];
