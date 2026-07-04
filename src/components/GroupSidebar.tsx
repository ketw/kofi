import React, { useState } from 'react';
import { Hash, Volume2, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import type { Group } from '../types';
import './GroupSidebar.css';

interface Props {
  group: Group;
  selectedChannelId: string;
  onSelectChannel: (id: string) => void;
  myId: string;
}

export default function GroupSidebar({ group, selectedChannelId, onSelectChannel, myId }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const isOwner = group.ownerIds.includes(myId);
  const totalUnread = group.channels.reduce((a, c) => a + c.unread, 0);

  return (
    <div className="group-sidebar">
      <div className="gs-header">
        <span className="gs-name">{group.name}</span>
        <span className="gs-code">{group.code}</span>
        {isOwner && <span className="gs-owner">OWNER</span>}
      </div>

      <div className="gs-body">
        <button className="gs-section-hd" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
          <span>CHANNELS</span>
          <button
            className="gs-add-ch"
            title="Add channel"
            onClick={e => e.stopPropagation()}
          >
            <Plus size={12} />
          </button>
        </button>

        {!collapsed && (
          <div className="gs-channels">
            {group.channels.map(ch => (
              <button
                key={ch.id}
                className={`gs-ch ${selectedChannelId === ch.id ? 'active' : ''} ${ch.unread > 0 ? 'unread' : ''}`}
                onClick={() => onSelectChannel(ch.id)}
              >
                <span className="gs-ch-icon">
                  {ch.type === 'voice' ? <Volume2 size={13} /> : <Hash size={13} />}
                </span>
                <span className="gs-ch-name">{ch.name}</span>
                {ch.unread > 0 && <span className="gs-ch-badge">{ch.unread}</span>}
              </button>
            ))}
          </div>
        )}

        <div className="gs-divider" />

        <div className="gs-members-label">MEMBERS — {group.memberIds.length}</div>
      </div>
    </div>
  );
}
