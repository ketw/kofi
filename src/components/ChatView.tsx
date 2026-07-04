import React, { useEffect, useRef, useState } from 'react';
import { Hash, Volume2, ArrowUp } from 'lucide-react';
import type { Channel, Message, User, Group } from '../types';
import { sendChannelMessage, markChannelRead } from '../store/appStore';
import './ChatView.css';

interface Props {
  group: Group;
  channel: Channel;
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

export default function ChatView({ group, channel, users, me }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    markChannelRead(group.id, channel.id);
  }, [channel.id, channel.messages.length]);

  const getUser = (id: string) =>
    users.find(u => u.id === id) ?? { id, username: id, displayName: id, status: 'offline' as const, joinedAt: 0 };

  function send() {
    if (!input.trim()) return;
    sendChannelMessage(group.id, channel.id, input.trim());
    setInput('');
    const ta = taRef.current;
    if (ta) { ta.style.height = 'auto'; }
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

  const isVoice = channel.type === 'voice';

  return (
    <div className="chatview">
      {/* Header */}
      <div className="cv-header">
        <div className="cv-header-left">
          {channel.type === 'voice' ? <Volume2 size={16} /> : <Hash size={16} />}
          <span className="cv-ch-name">{channel.name}</span>
          <span className="cv-sep" />
          <span className="cv-group-name">{group.name}</span>
        </div>
        <div className="cv-header-right">
          <span className="cv-members">{group.memberIds.length} MEMBERS</span>
        </div>
      </div>

      {/* Messages */}
      <div className="cv-messages">
        {/* Start banner — hermes-style large serif heading */}
        <div className="cv-start">
          <p className="cv-start-eyebrow hw-mono">
            {group.name} // #{channel.name}
          </p>
          <h2 className="cv-start-title">
            <span>{channel.type === 'voice' ? 'Voice' : 'Text'}</span>
            <span>Channel</span>
          </h2>
          <p className="cv-start-sub hw-mono">
            Beginning of #{channel.name} in {group.name}
          </p>
        </div>

        {channel.messages.map((msg, i) => {
          const author = getUser(msg.authorId);
          const grouped = isGrouped(channel.messages, i);
          const showDate = i === 0 || !sameDay(channel.messages[i - 1].timestamp, msg.timestamp);
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
      <div className="cv-input-area">
        {isVoice ? (
          <div className="cv-voice-notice">
            VOICE CHANNEL — audio will be enabled in the P2P backend phase
          </div>
        ) : (
          <div className="cv-input-wrap">
            <div className="cv-input-prefix">
              <Hash size={14} />{channel.name}
            </div>
            <textarea
              ref={taRef}
              className="cv-input"
              placeholder={`message #${channel.name}`}
              value={input}
              onChange={onInput}
              onKeyDown={onKey}
              rows={1}
            />
            <button
              className={`cv-send ${input.trim() ? 'ready' : ''}`}
              onClick={send}
              disabled={!input.trim()}
              title="Send"
            >
              <ArrowUp size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
