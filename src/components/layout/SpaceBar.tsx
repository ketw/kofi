import React, { useState } from 'react';
import { MessageSquare, Plus, Settings } from 'lucide-react';
import type { Space } from '../../types';
import { createSpace } from '../../store/appStore';
import './SpaceBar.css';

interface Props {
  spaces: Space[];
  selectedSpaceId: string | null;
  onSelectSpace: (id: string | null) => void;
  onOpenDMs: () => void;
  dmUnread: number;
}

const SPACE_ICONS = ['🎓', '💻', '🎮', '🎵', '📚', '🔬', '🎨', '🌍', '🏠', '⚡'];

export default function SpaceBar({ spaces, selectedSpaceId, onSelectSpace, onOpenDMs, dmUnread }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🎓');

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const s = createSpace(newName.trim(), newIcon);
    onSelectSpace(s.id);
    setNewName('');
    setNewIcon('🎓');
    setShowCreate(false);
  }

  return (
    <div className="spacebar">
      {/* DMs button */}
      <button
        className={`spacebar-btn dm-btn ${selectedSpaceId === null ? 'active' : ''}`}
        onClick={onOpenDMs}
        title="Direct Messages"
      >
        <MessageSquare size={22} />
        {dmUnread > 0 && <span className="badge">{dmUnread}</span>}
      </button>

      <div className="spacebar-divider" />

      {/* Spaces */}
      {spaces.map(space => {
        const totalUnread = space.sections
          .flatMap(s => s.channels)
          .reduce((acc, ch) => acc + (ch.unread ?? 0), 0);

        return (
          <button
            key={space.id}
            className={`spacebar-btn space-btn ${selectedSpaceId === space.id ? 'active' : ''}`}
            onClick={() => onSelectSpace(space.id)}
            title={space.name}
          >
            <span className="space-icon">{space.icon}</span>
            {totalUnread > 0 && <span className="badge">{totalUnread}</span>}
          </button>
        );
      })}

      {/* Add space */}
      <button
        className="spacebar-btn add-btn"
        onClick={() => setShowCreate(true)}
        title="Create Space"
      >
        <Plus size={22} />
      </button>

      <div className="spacebar-bottom">
        <button className="spacebar-btn settings-btn" title="Settings">
          <Settings size={20} />
        </button>
      </div>

      {/* Create space modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create a Space</h2>
            <form onSubmit={handleCreate}>
              <div className="icon-picker">
                {SPACE_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    className={`icon-option ${newIcon === icon ? 'selected' : ''}`}
                    onClick={() => setNewIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Space name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                maxLength={32}
              />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={!newName.trim()}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
