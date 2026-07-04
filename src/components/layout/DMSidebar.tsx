import React from 'react';
import { UserCircle2, MessageSquare } from 'lucide-react';
import type { DirectMessage, User } from '../../types';
import './DMSidebar.css';

interface Props {
  dms: DirectMessage[];
  selectedDMId: string | null;
  onSelectDM: (id: string) => void;
  users: User[];
  currentUser: User;
}

function statusColor(status: string) {
  switch (status) {
    case 'online': return '#3ba55c';
    case 'away': return '#faa81a';
    case 'busy': return '#ed4245';
    default: return '#747f8d';
  }
}

export default function DMSidebar({ dms, selectedDMId, onSelectDM, users, currentUser }: Props) {
  function getOtherUser(dm: DirectMessage): User | undefined {
    const otherId = dm.participantIds.find(id => id !== currentUser.id);
    return users.find(u => u.id === otherId);
  }

  function lastMessage(dm: DirectMessage) {
    const msgs = dm.messages;
    if (!msgs.length) return 'No messages yet';
    const last = msgs[msgs.length - 1];
    const isMe = last.authorId === currentUser.id;
    return `${isMe ? 'You: ' : ''}${last.content}`;
  }

  function formatTime(dm: DirectMessage) {
    const msgs = dm.messages;
    if (!msgs.length) return '';
    const d = new Date(msgs[msgs.length - 1].timestamp);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return d.toLocaleDateString();
  }

  return (
    <div className="dm-sidebar">
      <div className="dm-sidebar-header">
        <MessageSquare size={18} />
        <span>Direct Messages</span>
      </div>

      <div className="dm-list">
        {dms.map(dm => {
          const other = getOtherUser(dm);
          if (!other) return null;
          return (
            <button
              key={dm.id}
              className={`dm-item ${selectedDMId === dm.id ? 'active' : ''} ${(dm.unread ?? 0) > 0 ? 'unread' : ''}`}
              onClick={() => onSelectDM(dm.id)}
            >
              <div className="dm-avatar">
                <UserCircle2 size={36} />
                <span
                  className="dm-status"
                  style={{ background: statusColor(other.status) }}
                />
              </div>
              <div className="dm-info">
                <div className="dm-top">
                  <span className="dm-name">{other.displayName}</span>
                  <span className="dm-time">{formatTime(dm)}</span>
                </div>
                <div className="dm-preview">
                  <span className="dm-last">{lastMessage(dm)}</span>
                  {(dm.unread ?? 0) > 0 && (
                    <span className="dm-badge">{dm.unread}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* User panel */}
      <div className="user-panel">
        <div className="user-info">
          <div className="user-avatar-wrap">
            <UserCircle2 size={32} />
            <span className="user-status-dot" style={{ background: statusColor(currentUser.status) }} />
          </div>
          <div className="user-names">
            <span className="user-display">{currentUser.displayName}</span>
            <span className="user-sub">@{currentUser.username}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
