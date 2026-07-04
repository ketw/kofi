import React, { useEffect, useRef, useState } from 'react';
import { Hash, Volume2, Megaphone, Send, Smile, Paperclip, AtSign, Info } from 'lucide-react';
import type { Channel, Message, User } from '../../types';
import { sendChannelMessage, markChannelRead } from '../../store/appStore';
import './ChatView.css';

interface Props {
  spaceId: string;
  channel: Channel;
  users: User[];
  currentUser: User;
}

function ChannelIcon({ type }: { type: Channel['type'] }) {
  if (type === 'voice') return <Volume2 size={20} />;
  if (type === 'announcement') return <Megaphone size={20} />;
  return <Hash size={20} />;
}

function formatTimestamp(date: Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

function sameDay(a: Date, b: Date): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() === db.toDateString();
}

function isSameAuthorClose(messages: Message[], idx: number): boolean {
  if (idx === 0) return false;
  const prev = messages[idx - 1];
  const curr = messages[idx];
  const prevTime = new Date(prev.timestamp).getTime();
  const currTime = new Date(curr.timestamp).getTime();
  return prev.authorId === curr.authorId && (currTime - prevTime) < 1000 * 60 * 5;
}

export default function ChatView({ spaceId, channel, users, currentUser }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    markChannelRead(spaceId, channel.id);
  }, [channel.id, channel.messages.length]);

  function getUser(id: string): User {
    return users.find(u => u.id === id) ?? { id, username: id, displayName: id, status: 'offline' };
  }

  function handleSend() {
    if (!input.trim()) return;
    sendChannelMessage(spaceId, channel.id, input.trim());
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
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  const isAnnouncement = channel.type === 'announcement';

  return (
    <div className="chat-view">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <ChannelIcon type={channel.type} />
          <span className="chat-channel-name">{channel.name}</span>
          {channel.description && (
            <>
              <div className="header-divider" />
              <span className="chat-channel-desc">{channel.description}</span>
            </>
          )}
        </div>
        <div className="chat-header-right">
          <button className="header-btn" title="Channel info"><Info size={20} /></button>
          <button className="header-btn" title="Mentions"><AtSign size={20} /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {/* Channel start */}
        <div className="channel-start">
          <div className="channel-start-icon">
            <ChannelIcon type={channel.type} />
          </div>
          <h2>Welcome to #{channel.name}</h2>
          {channel.description && <p>{channel.description}</p>}
          <p className="channel-start-sub">This is the beginning of the #{channel.name} channel.</p>
        </div>

        {channel.messages.map((msg, idx) => {
          const author = getUser(msg.authorId);
          const grouped = isSameAuthorClose(channel.messages, idx);
          const showDateDivider = idx === 0 || !sameDay(
            new Date(channel.messages[idx - 1].timestamp),
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
                      <div className="avatar-placeholder">
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
                    <div className="message-time-inline">{formatTimestamp(new Date(msg.timestamp))}</div>
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
      <div className="chat-input-area">
        {isAnnouncement && (
          <div className="announcement-notice">
            Only administrators can post in announcement channels.
          </div>
        )}
        {!isAnnouncement && (
          <div className="chat-input-wrap">
            <button className="input-btn" title="Attach file"><Paperclip size={20} /></button>
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder={`Message #${channel.name}`}
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
              title="Send"
            >
              <Send size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
