import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { openOrCreateDM, getState } from '../../store/appStore';
import './ConnectPanel.css';

interface Props {
  onOpenDM: (dmId: string) => void;
}

export default function ConnectPanel({ onOpenDM }: Props) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'user' | 'group'>('user');
  const [feedback, setFeedback] = useState('');
  const { users, me, groups } = getState();

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    if (mode === 'user') {
      const target = users.find(u =>
        u.id !== me!.id &&
        (u.username.toLowerCase() === query.trim().toLowerCase() || u.id === query.trim())
      );
      if (target) {
        const dmId = openOrCreateDM(target.id);
        onOpenDM(dmId);
      } else {
        setFeedback(`no user found — "${query}"`);
      }
    } else {
      const g = groups.find(x =>
        x.code.toUpperCase() === query.trim().toUpperCase() || x.id === query.trim()
      );
      setFeedback(g ? `group "${g.name}" found — p2p join pending backend` : `no group found — "${query}"`);
    }
  }

  const peers = users.filter(u => u.id !== me?.id);

  return (
    <div className="cp">
      {/* feature art strip */}
      <div className="cp-art">
        <img src="/img/feature-connect.jpg" alt="" aria-hidden className="cp-art-img" />
        <span className="cp-art-label hw-mono">Find · Message · Connect</span>
      </div>

      <div className="cp-body">
        {/* mode toggle */}
        <div className="cp-toggle">
          <button className={`cp-tog hw-mono ${mode === 'user' ? 'active' : ''}`}
            onClick={() => { setMode('user'); setFeedback(''); setQuery(''); }}>
            @ User
          </button>
          <button className={`cp-tog hw-mono ${mode === 'group' ? 'active' : ''}`}
            onClick={() => { setMode('group'); setFeedback(''); setQuery(''); }}>
            # Group
          </button>
        </div>

        <form onSubmit={handleConnect} className="cp-form">
          <div className="cp-row">
            <span className="cp-prefix hw-mono">{mode === 'user' ? '@' : '#'}</span>
            <input className="cp-input" type="text" autoFocus autoComplete="off" spellCheck={false}
              placeholder={mode === 'user' ? 'username or user id' : 'group code'}
              value={query}
              onChange={e => { setQuery(e.target.value); setFeedback(''); }} />
            <button className="cp-go" type="submit" disabled={!query.trim()}>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>

        {feedback && <p className="cp-feedback hw-mono">— {feedback}</p>}

        <div className="cp-sep" />
        <p className="cp-sec-label hw-mono">Peers — {peers.length}</p>

        <div className="cp-peers">
          {peers.map(u => (
            <button key={u.id} className="cp-peer hw-arc-parent"
              onClick={() => { const d = openOrCreateDM(u.id); onOpenDM(d); }}>
              <span className="hw-arc" aria-hidden />
              <span className={`cp-dot ${u.status}`} />
              <span className="cp-pname hw-mono">@{u.username}</span>
              <span className="cp-pid hw-mono">{u.id.slice(-8).toUpperCase()}</span>
              <ArrowRight size={11} className="cp-arrow" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
