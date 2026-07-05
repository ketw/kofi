export interface User {
  id: string;
  username: string;
  displayName: string;
  status: 'online' | 'away' | 'offline';
  joinedAt: number;
}

export interface Message {
  id: string;
  authorId: string;
  content: string;
  timestamp: number;
  edited?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  messages: Message[];
  unread: number;
}

export interface Group {
  id: string;
  name: string;
  code: string;
  ownerIds: string[];
  memberIds: string[];
  channels: Channel[];
  createdAt: number;
}

export interface DirectMessage {
  id: string;
  participantIds: [string, string];
  messages: Message[];
  unread: number;
}

// Panels that can be open simultaneously as floating windows
export type PanelId = 'connect' | 'groups' | 'chat' | 'settings' | 'chatwindow' | 'theme';

export interface WindowState {
  id: PanelId;
  x: number;
  y: number;
  width: number;
  height?: number;
  zIndex: number;
}

export interface AppState {
  me: User | null;
  users: User[];
  groups: Group[];
  dms: DirectMessage[];
  openWindows: WindowState[];
  // active conversation shown inside the chat window
  chatView:
    | { type: 'home' }
    | { type: 'group'; groupId: string; channelId: string }
    | { type: 'dm'; dmId: string };
}
