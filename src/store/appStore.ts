import { useState, useCallback, useEffect } from 'react';
import { spaces as initialSpaces, directMessages as initialDMs, users, currentUser } from './mockData';
import type { Message, Space, DirectMessage } from '../types';

// Simple reactive store using module-level state + listeners
type Listener = () => void;

let _spaces = [...initialSpaces];
let _dms = [...initialDMs];
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(l => l());
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSpaces() { return _spaces; }
export function getDMs() { return _dms; }
export { users, currentUser };

export function sendChannelMessage(spaceId: string, channelId: string, content: string) {
  const msg: Message = {
    id: `m-${Date.now()}`,
    authorId: currentUser.id,
    content,
    timestamp: new Date(),
  };
  _spaces = _spaces.map(s => {
    if (s.id !== spaceId) return s;
    return {
      ...s,
      sections: s.sections.map(sec => ({
        ...sec,
        channels: sec.channels.map(ch => {
          if (ch.id !== channelId) return ch;
          return { ...ch, messages: [...ch.messages, msg] };
        }),
      })),
    };
  });
  notify();
}

export function sendDM(dmId: string, content: string) {
  const msg: Message = {
    id: `dm-${Date.now()}`,
    authorId: currentUser.id,
    content,
    timestamp: new Date(),
  };
  _dms = _dms.map(dm => {
    if (dm.id !== dmId) return dm;
    return { ...dm, messages: [...dm.messages, msg], unread: 0 };
  });
  notify();
}

export function createSpace(name: string, icon: string): Space {
  const newSpace: Space = {
    id: `s-${Date.now()}`,
    name,
    icon,
    members: [currentUser.id],
    sections: [
      {
        id: `sec-${Date.now()}`,
        name: 'General',
        channels: [
          {
            id: `c-${Date.now()}`,
            name: 'general',
            type: 'text',
            messages: [],
            unread: 0,
          },
        ],
      },
    ],
  };
  _spaces = [..._spaces, newSpace];
  notify();
  return newSpace;
}

export function markChannelRead(spaceId: string, channelId: string) {
  _spaces = _spaces.map(s => {
    if (s.id !== spaceId) return s;
    return {
      ...s,
      sections: s.sections.map(sec => ({
        ...sec,
        channels: sec.channels.map(ch => {
          if (ch.id !== channelId) return ch;
          return { ...ch, unread: 0 };
        }),
      })),
    };
  });
  notify();
}

export function markDMRead(dmId: string) {
  _dms = _dms.map(dm => {
    if (dm.id !== dmId) return dm;
    return { ...dm, unread: 0 };
  });
  notify();
}

// React hook to use store
export function useStore() {
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    const unsub = subscribe(forceUpdate);
    return unsub;
  }, [forceUpdate]);

  return {
    spaces: getSpaces(),
    dms: getDMs(),
    users,
    currentUser,
  };
}
