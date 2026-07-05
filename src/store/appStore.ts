import { useState, useCallback, useEffect } from 'react';
import type { AppState, User, Group, DirectMessage, Message, PanelId, WindowState } from '../types';

// ── mock seed data ──────────────────────────────────────────────
const ME: User = {
  id: 'hwid-local-001', username: 'ket', displayName: 'ket',
  status: 'online', joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
};

const USERS: User[] = [
  ME,
  { id: 'hwid-002', username: 'alice', displayName: 'alice', status: 'online',  joinedAt: Date.now() - 1000 * 60 * 60 * 24 * 2 },
  { id: 'hwid-003', username: 'bob',   displayName: 'bob',   status: 'away',    joinedAt: Date.now() - 1000 * 60 * 60 * 5 },
  { id: 'hwid-004', username: 'carol', displayName: 'carol', status: 'offline', joinedAt: Date.now() - 1000 * 60 * 60 * 24 },
];

const GROUPS: Group[] = [
  {
    id: 'g-001', name: 'dev collective', code: 'DEV-2049',
    ownerIds: ['hwid-local-001', 'hwid-002'], memberIds: ['hwid-local-001', 'hwid-002', 'hwid-003'],
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    channels: [
      { id: 'ch-001', name: 'general', type: 'text', unread: 0, messages: [
        { id: 'm1', authorId: 'hwid-002',        content: 'hey everyone',                 timestamp: Date.now() - 1000 * 60 * 30 },
        { id: 'm2', authorId: 'hwid-003',        content: 'what are we building today',   timestamp: Date.now() - 1000 * 60 * 25 },
        { id: 'm3', authorId: 'hwid-local-001',  content: 'p2p chat — fully local, no cloud', timestamp: Date.now() - 1000 * 60 * 20 },
      ]},
      { id: 'ch-002', name: 'builds', type: 'text', unread: 2, messages: [
        { id: 'm4', authorId: 'hwid-002', content: 'pushed new build — check it out',    timestamp: Date.now() - 1000 * 60 * 10 },
        { id: 'm5', authorId: 'hwid-002', content: 'fixed the channel unread counts',    timestamp: Date.now() - 1000 * 60 * 8  },
      ]},
      { id: 'ch-003', name: 'voice', type: 'voice', unread: 0, messages: [] },
    ],
  },
  {
    id: 'g-002', name: 'study hall', code: 'STUDY-77',
    ownerIds: ['hwid-local-001'], memberIds: ['hwid-local-001', 'hwid-004'],
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    channels: [
      { id: 'ch-004', name: 'general', type: 'text', unread: 1, messages: [
        { id: 'm6', authorId: 'hwid-004', content: 'session at 8pm?', timestamp: Date.now() - 1000 * 60 * 2 },
      ]},
    ],
  },
];

const DMS: DirectMessage[] = [
  {
    id: 'dm-hwid-local-001-hwid-002',
    participantIds: ['hwid-local-001', 'hwid-002'], unread: 0,
    messages: [
      { id: 'dm1', authorId: 'hwid-002',       content: 'yo, you see the build?', timestamp: Date.now() - 1000 * 60 * 45 },
      { id: 'dm2', authorId: 'hwid-local-001', content: 'yeah looks clean',        timestamp: Date.now() - 1000 * 60 * 40 },
    ],
  },
  {
    id: 'dm-hwid-local-001-hwid-003',
    participantIds: ['hwid-local-001', 'hwid-003'], unread: 1,
    messages: [
      { id: 'dm3', authorId: 'hwid-003', content: 'are you on?', timestamp: Date.now() - 1000 * 60 * 5 },
    ],
  },
];

// ── store ───────────────────────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();
let zTop = 100;

let state: AppState = {
  me: ME, users: USERS, groups: GROUPS, dms: DMS,
  openWindows: [],
  chatView: { type: 'home' },
};

function setState(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
}

export function subscribe(l: Listener) { listeners.add(l); return () => listeners.delete(l); }
export function getState() { return state; }

// ── window management ───────────────────────────────────────────
const WINDOW_DEFAULTS: Record<PanelId, { width: number; height?: number; x: number; y: number }> = {
  connect:    { width: 360,  x: 80,  y: 80  },
  groups:     { width: 380,  x: 120, y: 80  },
  chat:       { width: 400,  x: 160, y: 80  },
  settings:   { width: 360,  x: 200, y: 80  },
  chatwindow: { width: 820,  height: 560, x: 80, y: 80 },
  theme:      { width: 340,  x: 240, y: 80  },
};

export function toggleWindow(id: PanelId) {
  const existing = state.openWindows.find(w => w.id === id);
  if (existing) {
    setState({ openWindows: state.openWindows.filter(w => w.id !== id) });
  } else {
    const def = WINDOW_DEFAULTS[id];
    zTop++;
    setState({
      openWindows: [...state.openWindows, {
        id, x: def.x, y: def.y, width: def.width, height: def.height, zIndex: zTop,
      }],
    });
  }
}

export function closeWindow(id: PanelId) {
  setState({ openWindows: state.openWindows.filter(w => w.id !== id) });
}

export function bringToFront(id: PanelId) {
  zTop++;
  setState({ openWindows: state.openWindows.map(w => w.id === id ? { ...w, zIndex: zTop } : w) });
}

export function moveWindow(id: PanelId, x: number, y: number) {
  setState({ openWindows: state.openWindows.map(w => w.id === id ? { ...w, x, y } : w) });
}

// ── chat navigation (inside the chat window) ────────────────────
export function openGroupChat(groupId: string, channelId?: string) {
  const g = state.groups.find(x => x.id === groupId);
  const ch = channelId ?? g?.channels[0]?.id ?? '';
  setState({ chatView: { type: 'group', groupId, channelId: ch } });
  markChannelRead(groupId, ch);
  // open the chat window if not already open
  if (!state.openWindows.find(w => w.id === 'chatwindow')) {
    toggleWindow('chatwindow');
  } else {
    bringToFront('chatwindow');
  }
  closeWindow('groups');
  closeWindow('chat');
}

export function openChannelChat(groupId: string, channelId: string) {
  setState({ chatView: { type: 'group', groupId, channelId } });
  markChannelRead(groupId, channelId);
  if (!state.openWindows.find(w => w.id === 'chatwindow')) {
    toggleWindow('chatwindow');
  } else {
    bringToFront('chatwindow');
  }
}

export function openDMChat(dmId: string) {
  setState({ chatView: { type: 'dm', dmId } });
  markDMRead(dmId);
  if (!state.openWindows.find(w => w.id === 'chatwindow')) {
    toggleWindow('chatwindow');
  } else {
    bringToFront('chatwindow');
  }
  closeWindow('chat');
}

// ── messaging ───────────────────────────────────────────────────
export function sendChannelMessage(groupId: string, channelId: string, content: string) {
  const msg: Message = { id: `m-${Date.now()}`, authorId: state.me!.id, content, timestamp: Date.now() };
  setState({
    groups: state.groups.map(g => g.id !== groupId ? g : {
      ...g, channels: g.channels.map(ch => ch.id !== channelId ? ch : { ...ch, messages: [...ch.messages, msg] }),
    }),
  });
}

export function sendDMMessage(dmId: string, content: string) {
  const msg: Message = { id: `dm-${Date.now()}`, authorId: state.me!.id, content, timestamp: Date.now() };
  setState({ dms: state.dms.map(d => d.id !== dmId ? d : { ...d, messages: [...d.messages, msg], unread: 0 }) });
}

export function markChannelRead(groupId: string, channelId: string) {
  setState({
    groups: state.groups.map(g => g.id !== groupId ? g : {
      ...g, channels: g.channels.map(ch => ch.id !== channelId ? ch : { ...ch, unread: 0 }),
    }),
  });
}

export function markDMRead(dmId: string) {
  setState({ dms: state.dms.map(d => d.id !== dmId ? d : { ...d, unread: 0 }) });
}

export function createGroup(name: string, code: string): Group {
  const g: Group = {
    id: `g-${Date.now()}`, name: name.toLowerCase(), code: code.toUpperCase(),
    ownerIds: [state.me!.id], memberIds: [state.me!.id], createdAt: Date.now(),
    channels: [{ id: `ch-${Date.now()}`, name: 'general', type: 'text', messages: [], unread: 0 }],
  };
  setState({ groups: [...state.groups, g] });
  return g;
}

export function openOrCreateDM(userId: string): string {
  const ids = [state.me!.id, userId].sort();
  const dmId = `dm-${ids[0]}-${ids[1]}`;
  if (!state.dms.find(d => d.id === dmId)) {
    setState({ dms: [...state.dms, { id: dmId, participantIds: [state.me!.id, userId] as [string, string], messages: [], unread: 0 }] });
  }
  return dmId;
}

// ── React hook ──────────────────────────────────────────────────
export function useStore() {
  const [, tick] = useState(0);
  const bump = useCallback(() => tick(t => t + 1), []);
  useEffect(() => subscribe(bump), [bump]);
  return getState();
}
