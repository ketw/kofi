import React from 'react';
import { Hash, Volume2 } from 'lucide-react';
import { openDMChat, openGroupChat, openChannelChat, getState } from '../../store/appStore';
import './ChatPanel.css';

interface Props {
  onOpenDM: (dmId: string) => void;
  onOpenGroup: (groupId: string) => void;
}

function timeAgo(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}

export default function ChatPanel({ onOpenDM, onOpenGroup }: Props) {
  const { dms, groups, users, me } = getState();
  const totalDMUnread    = dms.reduce((a, d) => a + d.unread, 0);
  const totalGroupUnread = groups.flatMap(g => g.channels).reduce((a, c) => a + c.unread, 0);

  return (
    <div className="chp">
      <div className="chp-art">
        <img src="/img/feature-memory.jpg" alt="" aria-hidden className="chp-art-img" />
        <span className="chp-art-label hw-mono">Messages · Groups · Channels</span>
      </div>

      <div className="chp-body">
        {/* ── DMs ──────────────────────────────────────────────── */}
        <p className="chp-sec hw-mono">
          Direct Messages
          {totalDMUnread > 0 && <span className="chp-unread-count">{totalDMUnread}</span>}
        </p>

        <div className="chp-list">
          {dms.length === 0 && (
            <p className="chp-empty hw-mono">No conversations — use Connect.</p>
          )}
          {dms.map(dm => {
            const otherId = dm.participantIds.find(id => id !== me?.id);
            const other   = users.find(u => u.id === otherId);
            if (!other) return null;
            const last = dm.messages[dm.messages.length - 1];
            return (
              <button
                key={dm.id}
                className={`chp-item hw-arc-parent ${dm.unread > 0 ? 'unread' : ''}`}
                onClick={() => onOpenDM(dm.id)}
              >
                <span className="hw-arc" aria-hidden />
                <span className={`chp-dot ${other.status}`} />
                <div className="chp-info">
                  <div className="chp-top">
                    <span className="chp-name hw-mono">@{other.username}</span>
                    {last && <span className="chp-time hw-mono">{timeAgo(last.timestamp)}</span>}
                  </div>
                  {last && (
                    <span className="chp-preview hw-mono">
                      {last.authorId === me?.id ? 'you: ' : ''}{last.content}
                    </span>
                  )}
                </div>
                {dm.unread > 0 && <span className="chp-badge">{dm.unread}</span>}
              </button>
            );
          })}
        </div>

        <div className="chp-sep" />

        {/* ── Groups ───────────────────────────────────────────── */}
        <p className="chp-sec hw-mono">
          Groups
          {totalGroupUnread > 0 && <span className="chp-unread-count">{totalGroupUnread}</span>}
        </p>

        <div className="chp-list">
          {groups.length === 0 && (
            <p className="chp-empty hw-mono">No groups — create one in Groups.</p>
          )}
          {groups.map(g => {
            const unread = g.channels.reduce((a, c) => a + c.unread, 0);
            return (
              <div key={g.id} className="chp-group">
                {/* group header — opens first channel */}
                <button
                  className="chp-group-hd hw-arc-parent"
                  onClick={() => onOpenGroup(g.id)}
                >
                  <span className="hw-arc" aria-hidden />
                  <span className="chp-gname hw-mono">{g.name}</span>
                  <span className="chp-gcode hw-mono">{g.code}</span>
                  {unread > 0 && <span className="chp-badge">{unread}</span>}
                </button>

                {/* individual channels — each opens that specific channel directly */}
                {g.channels.slice(0, 4).map(ch => (
                  <button
                    key={ch.id}
                    className={`chp-ch hw-arc-parent ${ch.unread > 0 ? 'unread' : ''}`}
                    onClick={() => openChannelChat(g.id, ch.id)}
                  >
                    <span className="hw-arc" aria-hidden />
                    <span className="chp-ch-icon">
                      {ch.type === 'voice' ? <Volume2 size={10} /> : <Hash size={10} />}
                    </span>
                    <span className="chp-ch-name hw-mono">{ch.name}</span>
                    {ch.unread > 0 && <span className="chp-badge small">{ch.unread}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
