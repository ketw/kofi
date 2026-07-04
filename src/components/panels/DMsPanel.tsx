import React from 'react';
import { ArrowRight } from 'lucide-react';
import { getState } from '../../store/appStore';
import './DMsPanel.css';

interface Props {
  onOpen: (dmId: string) => void;
  onClose: () => void;
}

function timeAgo(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

export default function DMsPanel({ onOpen, onClose }: Props) {
  const { dms, users, me } = getState();

  return (
    <div className="panel dp">
      <div className="panel-header">
        <span className="panel-title">Messages</span>
        <button className="panel-close" onClick={onClose}>Close ✕</button>
      </div>

      <div className="panel-body">
        {/* feature art */}
        <div className="dp-art hw-noise hw-vignette">
          <img src="/img/feature-memory.jpg" alt="" aria-hidden className="dp-art-img" />
          <div className="dp-art-label hw-mono">Private · Sandboxed · Direct</div>
        </div>

        <p className="p-section-label">Conversations — {dms.length}</p>

        <div className="dp-list">
          {dms.length === 0 && (
            <p className="dp-empty hw-mono">No conversations — use Connect to start one.</p>
          )}
          {dms.map(dm => {
            const otherId = dm.participantIds.find(id => id !== me?.id);
            const other   = users.find(u => u.id === otherId);
            if (!other) return null;
            const last = dm.messages[dm.messages.length - 1];
            return (
              <button
                key={dm.id}
                className={`dp-item p-item hw-arc-parent ${dm.unread > 0 ? 'unread' : ''}`}
                onClick={() => onOpen(dm.id)}
              >
                <span className="hw-arc" aria-hidden />
                <span className={`dp-dot ${other.status}`} />
                <div className="dp-info">
                  <div className="dp-top">
                    <span className="dp-name hw-mono">@{other.username}</span>
                    {last && <span className="dp-time hw-mono">{timeAgo(last.timestamp)}</span>}
                  </div>
                  {last && (
                    <span className="dp-preview hw-mono">
                      {last.authorId === me?.id ? 'you: ' : ''}{last.content}
                    </span>
                  )}
                </div>
                {dm.unread > 0 && <span className="p-badge">{dm.unread}</span>}
                <ArrowRight size={12} className="dp-arrow" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
