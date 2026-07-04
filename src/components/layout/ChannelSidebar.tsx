import React, { useState } from 'react';
import { Hash, Volume2, Megaphone, ChevronDown, ChevronRight, Plus, UserCircle2 } from 'lucide-react';
import type { Space, Channel, ChannelSection } from '../../types';
import type { User } from '../../types';
import './ChannelSidebar.css';

interface Props {
  space: Space;
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  currentUser: User;
  users: User[];
}

function ChannelIcon({ type }: { type: Channel['type'] }) {
  if (type === 'voice') return <Volume2 size={16} />;
  if (type === 'announcement') return <Megaphone size={16} />;
  return <Hash size={16} />;
}

function statusColor(status: string) {
  switch (status) {
    case 'online': return '#3ba55c';
    case 'away': return '#faa81a';
    case 'busy': return '#ed4245';
    default: return '#747f8d';
  }
}

export default function ChannelSidebar({ space, selectedChannelId, onSelectChannel, currentUser, users }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const spaceMembers = users.filter(u => space.members.includes(u.id));

  function toggleSection(sectionId: string) {
    setCollapsed(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  return (
    <div className="channel-sidebar">
      <div className="sidebar-header">
        <span className="space-name">{space.icon} {space.name}</span>
      </div>

      <div className="sidebar-content">
        {space.sections.map((section: ChannelSection) => (
          <div key={section.id} className="section">
            <button
              className="section-header"
              onClick={() => toggleSection(section.id)}
            >
              {collapsed[section.id]
                ? <ChevronRight size={12} className="section-chevron" />
                : <ChevronDown size={12} className="section-chevron" />
              }
              <span>{section.name.toUpperCase()}</span>
              <button
                className="add-channel-btn"
                onClick={e => { e.stopPropagation(); }}
                title="Add channel"
              >
                <Plus size={14} />
              </button>
            </button>

            {!collapsed[section.id] && (
              <div className="channel-list">
                {section.channels.map((channel: Channel) => (
                  <button
                    key={channel.id}
                    className={`channel-item ${selectedChannelId === channel.id ? 'active' : ''} ${(channel.unread ?? 0) > 0 ? 'unread' : ''}`}
                    onClick={() => onSelectChannel(channel.id)}
                  >
                    <span className="channel-icon"><ChannelIcon type={channel.type} /></span>
                    <span className="channel-name">{channel.name}</span>
                    {(channel.unread ?? 0) > 0 && (
                      <span className="channel-badge">{channel.unread}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Members list */}
        <div className="section members-section">
          <div className="section-header static">
            <span>MEMBERS — {spaceMembers.length}</span>
          </div>
          <div className="member-list">
            {spaceMembers.map(member => (
              <div key={member.id} className="member-item">
                <div className="member-avatar">
                  <UserCircle2 size={28} />
                  <span
                    className="member-status"
                    style={{ background: statusColor(member.status) }}
                  />
                </div>
                <span className="member-name">
                  {member.displayName}
                  {member.id === currentUser.id && <span className="you-tag"> (you)</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User panel */}
      <div className="user-panel">
        <div className="user-info">
          <div className="user-avatar-wrap">
            <UserCircle2 size={32} />
            <span
              className="user-status-dot"
              style={{ background: statusColor(currentUser.status) }}
            />
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
