import React, { useEffect, useRef, useState } from 'react';
import { Hash, Volume2, ChevronDown, ChevronRight, Plus, ArrowUp } from 'lucide-react';
import type { Group, Channel, DirectMessage, User, Message } from '../types';
import {
  sendChannelMessage, sendDMMessage,
  markChannelRead, markDMRead,
  openChannelChat, openDMChat,
  getState,
} from '../store/appStore';
import './ChatWindow.css';

interface Props {
  chatView: { type: 'home' } | { type: 'group'; groupId: string; channelId: string } | { type: 'dm'; dmId: string };
  users: User[];
  me: User;
  groups: Group[];
  dms: DirectMessage[];
}

// ── helpers ──────────────────────────────────────────────────────
function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(ts: number) {
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase();
}
function sameDay(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}
function isGrouped(msgs: Message[], i: number) {
  if (i === 0) return false;
  return msgs[i].authorId === msgs[i - 1].authorId &&
    msgs[i].timestamp - msgs[i - 1].timestamp < 1000 * 60 * 5;
}
function statusColor(s: string) {
  if (s === 'online') return '#00cc55';
  if (s === 'away')   return '#cc8800';
  return 'rgba(245,245,245,0.22)';
}

// ── Sidebar (left column inside chat window) ─────────────────────
function CWSidebar({ chatView, groups, dms, me, users }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="cw-sidebar">
      {/* DMs */}
      <div className="cw-sb-section">
        <button className="cw-sb-hd" onClick={() => setCollapsed(c => ({ ...c, dms: !c.dms }))}>
          {collapsed.dms ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
          <span className="hw-mono">Messages</span>
          {dms.reduce((a, d) => a + d.unread, 0) > 0 && (
            <span className="cw-sb-badge">{dms.reduce((a, d) => a + d.unread, 0)}</span>
          )}
        </button>
        {!collapsed.dms && dms.map(dm => {
          const otherId = dm.participantIds.find(id => id !== me.id);
          const other   = users.find(u => u.id === otherId);
          if (!other) return null;
          const active = chatView.type === 'dm' && chatView.dmId === dm.id;
          return (
            <button
              key={dm.id}
              className={`cw-sb-dm ${active ? 'active' : ''} ${dm.unread > 0 ? 'unread' : ''}`}
              onClick={() => openDMChat(dm.id)}
            >
              <span className="cw-sb-dot" style={{ background: statusColor(other.status) }} />
              <span className="cw-sb-item-name hw-mono">@{other.username}</span>
              {dm.unread > 0 && <span className="cw-sb-badge">{dm.unread}</span>}
            </button>
          );
        })}
      </div>

      {/* Groups */}
      {groups.map(g => {
        const isOpen = !collapsed[g.id];
        const groupActive = chatView.type === 'group' && chatView.groupId === g.id;
        return (
          <div key={g.id} className="cw-sb-section">
            <button
              className={`cw-sb-hd ${groupActive ? 'group-active' : ''}`}
              onClick={() => setCollapsed(c => ({ ...c, [g.id]: !c[g.id] }))}
            >
              {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              <span className="hw-mono">{g.name}</span>
              {g.channels.reduce((a, c) => a + c.unread, 0) > 0 && (
                <span className="cw-sb-badge">{g.channels.reduce((a, c) => a + c.unread, 0)}</span>
              )}
            </button>
            {isOpen && g.channels.map(ch => {
              const active = chatView.type === 'group' &&
                chatView.groupId === g.id && chatView.channelId === ch.id;
              return (
                <button
                  key={ch.id}
                  className={`cw-sb-ch ${active ? 'active' : ''} ${ch.unread > 0 ? 'unread' : ''}`}
                  onClick={() => openChannelChat(g.id, ch.id)}
                >
                  <span className="cw-sb-ch-icon">
                    {ch.type === 'voice' ? <Volume2 size={11} /> : <Hash size={11} />}
                  </span>
                  <span className="cw-sb-item-name hw-mono">{ch.name}</span>
                  {ch.unread > 0 && <span className="cw-sb-badge">{ch.unread}</span>}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Message list ─────────────────────────────────────────────────
function MessageList({ messages, me, users }: { messages: Message[]; me: User; users: User[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const getUser = (id: string) =>
    users.find(u => u.id === id) ?? { id, username: id, displayName: id, status: 'offline' as const, joinedAt: 0 };

  return (
    <div className="cw-msgs">
      {messages.map((msg, i) => {
        const author  = getUser(msg.authorId);
        const grouped = isGrouped(messages, i);
        const isMe    = msg.authorId === me.id;
        const showDate = i === 0 || !sameDay(messages[i - 1].timestamp, msg.timestamp);

        return (
          <React.Fragment key={msg.id}>
            {showDate && (
              <div className="cw-date-div">
                <span className="hw-mono">{fmtDate(msg.timestamp)}</span>
              </div>
            )}
            <div className={`cw-msg ${grouped ? 'grouped' : ''} ${isMe ? 'mine' : ''}`}>
              {!grouped ? (
                <div className="cw-avatar">{author.username[0].toUpperCase()}</div>
              ) : (
                <div className="cw-ts-hover hw-mono">{fmt(msg.timestamp)}</div>
              )}
              <div className="cw-msg-body">
                {!grouped && (
                  <div className="cw-msg-hd">
                    <span className={`cw-author hw-mono ${isMe ? 'me' : ''}`}>
                      @{author.username}
                    </span>
                    <span className="cw-ts hw-mono">{fmt(msg.timestamp)}</span>
                  </div>
                )}
                <p className="cw-text">{msg.content}</p>
              </div>
            </div>
          </React.Fragment>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

// ── Input bar ────────────────────────────────────────────────────
function InputBar({ placeholder, onSend }: { placeholder: string; onSend: (v: string) => void }) {
  const [val, setVal] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  function send() {
    if (!val.trim()) return;
    onSend(val.trim());
    setVal('');
    if (taRef.current) taRef.current.style.height = 'auto';
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setVal(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  return (
    <div className="cw-input-wrap">
      <textarea
        ref={taRef}
        className="cw-input"
        placeholder={placeholder}
        value={val}
        rows={1}
        onChange={onInput}
        onKeyDown={onKey}
      />
      <button className={`cw-send ${val.trim() ? 'ready' : ''}`} onClick={send} disabled={!val.trim()}>
        <ArrowUp size={14} />
      </button>
    </div>
  );
}

// ── Main ChatWindow export ───────────────────────────────────────
export default function ChatWindow({ chatView, users, me, groups, dms }: Props) {
  // Resolve active content
  const activeGroup   = chatView.type === 'group' ? groups.find(g => g.id === chatView.groupId)   : null;
  const activeChannel = activeGroup && chatView.type === 'group'
    ? activeGroup.channels.find(c => c.id === chatView.channelId) : null;
  const activeDM      = chatView.type === 'dm'    ? dms.find(d => d.id === chatView.dmId)          : null;

  // Mark read on mount / change
  useEffect(() => {
    if (chatView.type === 'group' && activeGroup && activeChannel) {
      markChannelRead(activeGroup.id, activeChannel.id);
    } else if (chatView.type === 'dm' && activeDM) {
      markDMRead(activeDM.id);
    }
  }, [chatView]);

  // Resolve messages + placeholder
  const messages: Message[] = activeChannel?.messages ?? activeDM?.messages ?? [];

  let headerTitle = 'Chat';
  let placeholder = 'type a message...';
  let headerSub   = '';

  if (activeGroup && activeChannel) {
    headerTitle = `#${activeChannel.name}`;
    headerSub   = activeGroup.name;
    placeholder = `message #${activeChannel.name}`;
  } else if (activeDM) {
    const otherId = activeDM.participantIds.find(id => id !== me.id);
    const other   = users.find(u => u.id === otherId);
    headerTitle = `@${other?.username ?? '?'}`;
    headerSub   = 'private · sandboxed';
    placeholder = `message @${other?.username ?? '?'}`;
  }

  function handleSend(content: string) {
    if (activeGroup && activeChannel) {
      sendChannelMessage(activeGroup.id, activeChannel.id, content);
    } else if (activeDM) {
      sendDMMessage(activeDM.id, content);
    }
  }

  return (
    <div className="cw-root">
      {/* left sidebar */}
      <CWSidebar chatView={chatView} groups={groups} dms={dms} me={me} users={users} />

      {/* right: header + messages + input */}
      <div className="cw-main">
        {/* header */}
        <div className="cw-header">
          <span className="cw-header-title hw-mono">{headerTitle}</span>
          {headerSub && <span className="cw-header-sub hw-mono">{headerSub}</span>}
        </div>

        {/* content */}
        {chatView.type === 'home' ? (
          <div className="cw-home">
            <p className="cw-home-eyebrow hw-mono">Teachat // Chat</p>
            <h2 className="cw-home-title">Select a channel<br />or conversation</h2>
          </div>
        ) : (chatView.type === 'group' && !activeChannel) ? (
          <div className="cw-home">
            <p className="cw-home-eyebrow hw-mono">Voice Channel</p>
            <h2 className="cw-home-title">Audio enabled<br />in backend phase</h2>
          </div>
        ) : (
          <>
            <MessageList messages={messages} me={me} users={users} />
            <InputBar placeholder={placeholder} onSend={handleSend} />
          </>
        )}
      </div>
    </div>
  );
}
