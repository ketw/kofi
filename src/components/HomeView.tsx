import React from 'react';
import './HomeView.css';

interface Props {
  username: string;
  userId: string;
  groupCount: number;
  dmUnread: number;
}

export default function HomeView({ username, userId, groupCount, dmUnread }: Props) {
  return (
    <div className="homeview">
      <div className="hv-inner">
        <p className="hv-eyebrow hw-mono">TeaChat // Local P2P</p>

        <div className="hv-id-card">
          <div className="hv-id-row">
            <span className="hv-id-key hw-mono">Username</span>
            <span className="hv-id-val hw-mono">@{username}</span>
          </div>
          <div className="hv-id-row">
            <span className="hv-id-key hw-mono">User ID</span>
            <span className="hv-id-val hw-mono hv-id-mono">{userId}</span>
          </div>
          <div className="hv-id-row">
            <span className="hv-id-key hw-mono">Groups</span>
            <span className="hv-id-val hw-mono">{groupCount}</span>
          </div>
          <div className="hv-id-row">
            <span className="hv-id-key hw-mono">Unread</span>
            <span className="hv-id-val hw-mono">{dmUnread}</span>
          </div>
          <div className="hv-id-row">
            <span className="hv-id-key hw-mono">Network</span>
            <span className="hv-id-val hw-mono">Local · LAN · P2P</span>
          </div>
        </div>

        <p className="hv-hint hw-mono">
          Use the bar above to open windows
        </p>
      </div>
    </div>
  );
}
