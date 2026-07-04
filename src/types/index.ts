export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
}

export interface Message {
  id: string;
  authorId: string;
  content: string;
  timestamp: Date;
  edited?: boolean;
  reactions?: Reaction[];
  replyTo?: string;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'announcement';
  description?: string;
  messages: Message[];
  unread?: number;
}

export interface ChannelSection {
  id: string;
  name: string;
  collapsed?: boolean;
  channels: Channel[];
}

export interface Space {
  id: string;
  name: string;
  icon?: string;
  sections: ChannelSection[];
  members: string[];
}

export interface DirectMessage {
  id: string;
  participantIds: string[];
  messages: Message[];
  unread?: number;
}
