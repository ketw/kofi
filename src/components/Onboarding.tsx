import React, { useState } from 'react';
import './Onboarding.css';

interface Props {
  onClaim: (username: string) => void;
}

export default function Onboarding({ onClaim }: Props) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function validate(v: string) {
    if (v.length < 2) return 'minimum 2 characters';
    if (v.length > 24) return 'maximum 24 characters';
    if (!/^[a-z0-9_\-]+$/.test(v)) return 'letters, numbers, _ and - only';
    return '';
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(username);
    if (err) { setError(err); return; }
    setDone(true);
    setTimeout(() => onClaim(username), 700);
  }

  return (
    <div className="ob">
      {/* exact hermes grid background */}
      <div className="ob-grid" aria-hidden />
      {/* noise overlay */}
      <div className="ob-noise hw-noise" aria-hidden />

      {/* hero art — mix-blend-lighten like hermes */}
      <img
        className="ob-hero-art"
        src="/img/hero-art.jpg"
        alt=""
        aria-hidden
      />

      <div className="ob-inner">
        <p className="ob-eyebrow hw-mono">Teachat // First Launch</p>

        <h1 className="ob-title">
          <span>Claim</span>
          <span>Your</span>
          <span>Identity</span>
        </h1>

        <p className="ob-body hw-mono">
          Your username is permanent and bound to this device's hardware fingerprint.
          Once claimed it cannot be changed or reused by anyone else.
        </p>

        <form className="ob-form" onSubmit={submit}>
          <div className={`ob-input-wrap ${error ? 'has-error' : ''}`}>
            <span className="ob-at">@</span>
            <input
              className="ob-input"
              type="text"
              placeholder="username"
              value={username}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              maxLength={24}
              disabled={done}
              onChange={e => {
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_\-]/g, ''));
                setError('');
              }}
            />
          </div>

          {error && <p className="ob-error hw-mono">— {error}</p>}

          <div className="ob-meta hw-mono">
            <span>uid bound to hardware fingerprint</span>
            <span>{username.length} / 24</span>
          </div>

          <button
            className={`ob-btn hw-arc-parent ${done ? 'ob-btn--done' : ''}`}
            type="submit"
            disabled={!username || done}
          >
            <span className="hw-arc" />
            <span className="hw-mono">
              {done ? 'Identity Locked In' : 'Claim Username →'}
            </span>
          </button>
        </form>

        <p className="ob-warning hw-mono">
          Permanent · Cannot Be Undone · Bound to This HWID
        </p>
      </div>

      {/* badge — exact from hermes */}
      <img className="ob-badge" src="/img/badge.webp" alt="" aria-hidden />
    </div>
  );
}
