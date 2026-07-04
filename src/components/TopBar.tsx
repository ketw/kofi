import React from 'react';
import { Link2, Users, MessageSquare, Settings, X } from 'lucide-react';
import type { PanelId } from '../types';
import './TopBar.css';

interface Props {
  activePanel: PanelId;
  onPanel: (id: PanelId) => void;
  username: string;
  userId: string;
  totalUnread: number;
}

const PANELS: { id: PanelId; icon: React.ReactNode; label: string }[] = [
  { id: 'connect',  icon: <Link2 size={16} />,        label: 'CONNECT'  },
  { id: 'groups',   icon: <Users size={16} />,         label: 'GROUPS'   },
  { id: 'dms',      icon: <MessageSquare size={16} />, label: 'MESSAGES' },
  { id: 'settings', icon: <Settings size={16} />,      label: 'SETTINGS' },
];

export default function TopBar({ activePanel, onPanel, username, userId, totalUnread }: Props) {
  return (
    <div className="topbar">
      <div className="topbar-brand">
        <span className="topbar-logo">🍵</span>
        <span className="topbar-name">TEACHAT</span>
      </div>

      <nav className="topbar-nav">
        {PANELS.map(p => (
          <button
            key={p.id}
            className={`topbar-btn ${activePanel === p.id ? 'active' : ''}`}
            onClick={() => onPanel(p.id)}
            title={p.label}
          >
            {p.icon}
            <span className="topbar-btn-label">{p.label}</span>
            {p.id === 'dms' && totalUnread > 0 && (
              <span className="topbar-badge">{totalUnread}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="topbar-user">
        <span className="topbar-uid" title={`UID: ${userId}`}>
          {userId.slice(-8).toUpperCase()}
        </span>
        <span className="topbar-username">@{username}</span>
        <span className="topbar-dot online" />
      </div>
    </div>
  );
}
