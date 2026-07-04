import React, { useState } from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { createGroup, openGroupChat, getState } from '../../store/appStore';
import './GroupsPanel.css';

interface Props {
  onOpen: (groupId: string) => void;
}

export default function GroupsPanel({ onOpen }: Props) {
  const { groups, me } = getState();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    if (!/^[A-Z0-9\-]{3,12}$/.test(code.toUpperCase())) {
      setErr('3–12 chars, A-Z 0-9 and - only'); return;
    }
    const g = createGroup(name.trim(), code.trim());
    setCreating(false); setName(''); setCode(''); setErr('');
    onOpen(g.id);
  }

  return (
    <div className="gp">
      <div className="gp-art">
        <img src="/img/feature-tasks.jpg" alt="" aria-hidden className="gp-art-img" />
        <span className="gp-art-label hw-mono">Groups · Channels · Equal Privilege</span>
      </div>

      <div className="gp-body">
        {!creating ? (
          <>
            <button className="gp-create-btn hw-mono" onClick={() => setCreating(true)}>
              <Plus size={12} /> Create New Group
            </button>

            <p className="gp-sec-label hw-mono">Your Groups — {groups.length}</p>

            <div className="gp-list">
              {groups.map(g => {
                const unread = g.channels.reduce((a, c) => a + c.unread, 0);
                const isOwner = g.ownerIds.includes(me?.id ?? '');
                return (
                  <button key={g.id} className="gp-item hw-arc-parent" onClick={() => onOpen(g.id)}>
                    <span className="hw-arc" aria-hidden />
                    <div className="gp-item-body">
                      <div className="gp-item-top">
                        <span className="gp-name hw-mono">{g.name}</span>
                        {isOwner && <span className="gp-owner hw-mono">Owner</span>}
                      </div>
                      <div className="gp-meta hw-mono">
                        <span>{g.memberIds.length} members</span>
                        <span className="gp-code">{g.code}</span>
                      </div>
                    </div>
                    <div className="gp-right">
                      {unread > 0 && <span className="gp-badge">{unread}</span>}
                      <ArrowRight size={12} />
                    </div>
                  </button>
                );
              })}
              {groups.length === 0 && (
                <p className="gp-empty hw-mono">No groups yet.</p>
              )}
            </div>
          </>
        ) : (
          <form className="gp-form" onSubmit={handleCreate}>
            <p className="gp-sec-label hw-mono">New Group</p>
            <div className="gp-field">
              <label className="gp-label hw-mono">Name</label>
              <input className="gp-input" type="text" placeholder="dev collective"
                value={name} onChange={e => setName(e.target.value.toLowerCase())}
                autoFocus maxLength={32} />
            </div>
            <div className="gp-field">
              <label className="gp-label hw-mono">Join Code</label>
              <input className="gp-input" type="text" placeholder="DEV-2049"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setErr(''); }}
                maxLength={12} style={{ textTransform: 'uppercase' }} />
              {err && <span className="gp-err hw-mono">{err}</span>}
            </div>
            <div className="gp-actions">
              <button type="button" className="gp-cancel hw-mono" onClick={() => setCreating(false)}>Cancel</button>
              <button type="submit"  className="gp-submit hw-mono" disabled={!name.trim() || !code.trim()}>Create →</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
