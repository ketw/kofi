import type { User, Space, DirectMessage } from '../types';

export const currentUser: User = {
  id: 'me',
  username: 'you',
  displayName: 'You',
  status: 'online',
};

export const users: User[] = [
  currentUser,
  { id: 'u1', username: 'alice', displayName: 'Alice', status: 'online' },
  { id: 'u2', username: 'bob', displayName: 'Bob', status: 'away' },
  { id: 'u3', username: 'carol', displayName: 'Carol', status: 'busy' },
  { id: 'u4', username: 'dan', displayName: 'Dan', status: 'offline' },
];

export const spaces: Space[] = [
  {
    id: 's1',
    name: 'Study Group',
    icon: '📚',
    members: ['me', 'u1', 'u2', 'u3'],
    sections: [
      {
        id: 'sec1',
        name: 'General',
        channels: [
          {
            id: 'c1',
            name: 'welcome',
            type: 'text',
            description: 'Welcome to the study group!',
            messages: [
              {
                id: 'm1',
                authorId: 'u1',
                content: 'Hey everyone! Welcome to the study group 👋',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
              },
              {
                id: 'm2',
                authorId: 'u2',
                content: 'Excited to be here!',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5),
              },
              {
                id: 'm3',
                authorId: 'me',
                content: 'Same here, let\'s get started!',
                timestamp: new Date(Date.now() - 1000 * 60 * 60),
              },
            ],
            unread: 0,
          },
          {
            id: 'c2',
            name: 'announcements',
            type: 'announcement',
            description: 'Important announcements only',
            messages: [
              {
                id: 'm4',
                authorId: 'u1',
                content: 'Session this Friday at 6pm!',
                timestamp: new Date(Date.now() - 1000 * 60 * 30),
              },
            ],
            unread: 1,
          },
        ],
      },
      {
        id: 'sec2',
        name: 'Subjects',
        channels: [
          {
            id: 'c3',
            name: 'mathematics',
            type: 'text',
            messages: [
              {
                id: 'm5',
                authorId: 'u3',
                content: 'Can someone help with calculus?',
                timestamp: new Date(Date.now() - 1000 * 60 * 45),
              },
            ],
            unread: 2,
          },
          {
            id: 'c4',
            name: 'physics',
            type: 'text',
            messages: [],
            unread: 0,
          },
          {
            id: 'c5',
            name: 'study-hall',
            type: 'voice',
            messages: [],
            unread: 0,
          },
        ],
      },
    ],
  },
  {
    id: 's2',
    name: 'Dev Team',
    icon: '💻',
    members: ['me', 'u1', 'u4'],
    sections: [
      {
        id: 'sec3',
        name: 'General',
        channels: [
          {
            id: 'c6',
            name: 'general',
            type: 'text',
            messages: [
              {
                id: 'm6',
                authorId: 'u4',
                content: 'PR is ready for review',
                timestamp: new Date(Date.now() - 1000 * 60 * 10),
              },
            ],
            unread: 1,
          },
          {
            id: 'c7',
            name: 'deployments',
            type: 'announcement',
            messages: [],
            unread: 0,
          },
        ],
      },
    ],
  },
];

export const directMessages: DirectMessage[] = [
  {
    id: 'dm1',
    participantIds: ['me', 'u1'],
    messages: [
      {
        id: 'dm1m1',
        authorId: 'u1',
        content: 'Hey! Did you finish the homework?',
        timestamp: new Date(Date.now() - 1000 * 60 * 20),
      },
      {
        id: 'dm1m2',
        authorId: 'me',
        content: 'Almost done, just the last problem.',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
      },
    ],
    unread: 0,
  },
  {
    id: 'dm2',
    participantIds: ['me', 'u2'],
    messages: [
      {
        id: 'dm2m1',
        authorId: 'u2',
        content: 'Are you joining Friday?',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
      },
    ],
    unread: 1,
  },
  {
    id: 'dm3',
    participantIds: ['me', 'u3'],
    messages: [],
    unread: 0,
  },
];
