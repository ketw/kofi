import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import type { DirectMessage, User } from '../types';
import type { Message } from '../types';
import { sendDMMessage, markDMRead } from '../store/appStore';
import './DMView.css';
import './ChatView.css';

interface Props {
  dm: DirectMessage;
  users: User[];
  me: User;
}

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'TODAY';
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'YESTERDAY';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}
function sameDay(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}
function isGrouped(msgs: Message[], i: number) {
  if (i === 0) return false;
  return msgs[i].authorId === msgs[i - 1].authorId &&
    msgs[i].timestamp - msgs[i - 1].timestamp < 1000 * 60 * 5;
}
function statusDot(s: string) {
  if (s === 'online') return '#44ff88';
  if (s === 'away') return '#ffaa22';
  return 'rgba(245,245,245,0.25)';
}

export default function DMView({ dm, users, me }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const otherId = dm.participantIds.find(id => id !== me.id);
  const other = users.find(u => u.id === otherId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    markDMRead(dm.id);
  }, [dm.id, dm.messages.length]);

  const getUser = (id: string) =>
    users.find(u => u.id === id) ?? { id, username: id, displayName: id, status: 'offline' as const, joinedAt: 0 };

  function send() {
    if (!input.trim()) return;
    sendDMMessage(dm.id, input.trim());
    setInput('');
    const ta = taRef.current;
    if (ta) ta.style.height = 'auto';
    taRef.current?.focus();
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }

  if (!other) return null;

  return (
    <div className="dmview">
      {/* Header */}
      <div className="dv-header">
        <div className="dv-header-left">
          <span className="dv-dot" style={{ background: statusDot(other.status) }} />
          <span className="dv-name">@{other.username}</span>
          <span className="dv-uid">{other.id.slice(-8).toUpperCase()}</span>
        </div>
        <div className="dv-tag">PRIVATE · SANDBOXED</div>
      </div>

      {/* Messages */}
      <div className="dv-messages">
        {/* Convo start — hermes serif heading style */}
        <div className="dv-start">
          <p className="dv-start-eyebrow hw-mono">Direct Message // Private</p>
          <h2 className="dv-start-title">@{other.username}</h2>
          <p className="dv-start-sub hw-mono">
            Private · sandboxed · no one else has access
          </p>
          <span className="dv-start-id hw-mono">{other.id}</span>
        </div>

        {dm.messages.map((msg, i) => {
          const author = getUser(msg.authorId);
          const grouped = isGrouped(dm.messages, i);
          const showDate = i === 0 || !sameDay(dm.messages[i - 1].timestamp, msg.timestamp);
          const isMe = msg.authorId === me.id;

          return (
            <React.Fragment key={msg.id}>
              {showDate && (
                <div className="cv-date-div">
                  <span>{fmtDate(msg.timestamp)}</span>
                </div>
              )}
              <div className={`cv-msg ${grouped ? 'grouped' : ''} ${isMe ? 'mine' : ''}`}>
                {!grouped ? (
                  <div className="cv-avatar">
                    {author.username[0].toUpperCase()}
                  </div>
                ) : (
                  <div className="cv-ts-ghost">{fmt(msg.timestamp)}</div>
                )}
                <div className="cv-msg-body">
                  {!grouped && (
                    <div className="cv-msg-header">
                      <span className={`cv-author ${isMe ? 'me' : ''}`}>
                        @{author.username}
                      </span>
                      <span className="cv-ts">{fmt(msg.timestamp)}</span>
                    </div>
                  )}
                  <p className="cv-text">{msg.content}</p>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="dv-input-area">
        <div className="cv-input-wrap">
          <div className="cv-input-prefix">
            DM @{other.username}
          </div>
          <textarea
            ref={taRef}
            className="cv-input"
            placeholder={`message @${other.username}`}
            value={input}
            onChange={onInput}
            onKeyDown={onKey}
            rows={1}
          />
          <button
            className={`cv-send ${input.trim() ? 'ready' : ''}`}
            onClick={send}
            disabled={!input.trim()}
          >
            <ArrowUp size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
