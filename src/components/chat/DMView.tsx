import React, { useEffect, useRef, useState } from 'react';
import { Send, Smile, Paperclip, UserCircle2, Phone, Video } from 'lucide-react';
import type { DirectMessage, User } from '../../types';
import type { Message } from '../../types';
import { sendDM, markDMRead } from '../../store/appStore';
import './DMView.css';

interface Props {
  dm: DirectMessage;
  users: User[];
  currentUser: User;
}

function formatTimestamp(date: Date): string {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

function sameDay(a: Date, b: Date): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function isSameAuthorClose(messages: Message[], idx: number): boolean {
  if (idx === 0) return false;
  const prev = messages[idx - 1];
  const curr = messages[idx];
  return prev.authorId === curr.authorId &&
    new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime() < 1000 * 60 * 5;
}

function statusColor(status: string) {
  switch (status) {
    case 'online': return '#3ba55c';
    case 'away': return '#faa81a';
    case 'busy': return '#ed4245';
    default: return '#747f8d';
  }
}

export default function DMView({ dm, users, currentUser }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const otherId = dm.participantIds.find(id => id !== currentUser.id);
  const otherUser = users.find(u => u.id === otherId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    markDMRead(dm.id);
  }, [dm.id, dm.messages.length]);

  function getUser(id: string): User {
    return users.find(u => u.id === id) ?? { id, username: id, displayName: id, status: 'offline' };
  }

  function handleSend() {
    if (!input.trim()) return;
    sendDM(dm.id, input.trim());
    setInput('');
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  if (!otherUser) return null;

  return (
    <div className="dm-view">
      {/* Header */}
      <div className="dm-header">
        <div className="dm-header-left">
          <div className="dm-header-avatar">
            <UserCircle2 size={28} />
            <span
              className="dm-header-status"
              style={{ background: statusColor(otherUser.status) }}
            />
          </div>
          <span className="dm-header-name">{otherUser.displayName}</span>
          <span className="dm-header-username">@{otherUser.username}</span>
        </div>
        <div className="dm-header-right">
          <button className="header-btn" title="Voice call"><Phone size={20} /></button>
          <button className="header-btn" title="Video call"><Video size={20} /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="dm-messages">
        {/* Conversation start */}
        <div className="dm-convo-start">
          <div className="dm-start-avatar">
            <UserCircle2 size={56} />
          </div>
          <h2>{otherUser.displayName}</h2>
          <p>@{otherUser.username}</p>
          <p className="dm-start-sub">
            This is the beginning of your direct message history with {otherUser.displayName}.
          </p>
        </div>

        {dm.messages.map((msg, idx) => {
          const author = getUser(msg.authorId);
          const grouped = isSameAuthorClose(dm.messages, idx);
          const showDateDivider = idx === 0 || !sameDay(
            new Date(dm.messages[idx - 1].timestamp),
            new Date(msg.timestamp)
          );

          return (
            <React.Fragment key={msg.id}>
              {showDateDivider && (
                <div className="date-divider">
                  <span>{formatDate(new Date(msg.timestamp))}</span>
                </div>
              )}
              <div className={`message ${grouped ? 'grouped' : ''}`}>
                {!grouped ? (
                  <>
                    <div className="message-avatar">
                      <div
                        className="avatar-placeholder"
                        style={{
                          background: msg.authorId === currentUser.id ? 'var(--accent)' : 'var(--bg-500)',
                        }}
                      >
                        {author.displayName[0].toUpperCase()}
                      </div>
                    </div>
                    <div className="message-content">
                      <div className="message-header">
                        <span className={`message-author ${msg.authorId === currentUser.id ? 'is-me' : ''}`}>
                          {author.displayName}
                        </span>
                        <span className="message-time">{formatTimestamp(new Date(msg.timestamp))}</span>
                      </div>
                      <p className="message-text">{msg.content}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="message-time-inline">
                      {formatTimestamp(new Date(msg.timestamp))}
                    </div>
                    <p className="message-text grouped-text">{msg.content}</p>
                  </>
                )}
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="dm-input-area">
        <div className="chat-input-wrap">
          <button className="input-btn" title="Attach file"><Paperclip size={20} /></button>
          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder={`Message ${otherUser.displayName}`}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button className="input-btn" title="Emoji"><Smile size={20} /></button>
          <button
            className={`send-btn ${input.trim() ? 'active' : ''}`}
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
