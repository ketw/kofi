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
    <div className="homeview hw-vignette">
      {/* noise overlay — exact hw-noise */}
      <div className="hv-noise" aria-hidden />

      {/* hero art — mix-blend-lighten, exact hermes treatment */}
      <img
        className="hv-hero-art"
        src="/img/hero-art.jpg"
        alt=""
        aria-hidden
      />

      {/* badge sticky — exact hermes badge position */}
      <img className="hv-badge" src="/img/badge.webp" alt="" aria-hidden />

      {/* main content */}
      <div className="hv-inner">
        <p className="hv-eyebrow hw-mono">TeaChat // Local P2P // Open Network</p>

        {/* hermes-style large serif stacked title */}
        <h1 className="hv-title">
          <span>The Chat</span>
          <span>That Stays</span>
          <span>Local</span>
        </h1>

        {/* identity card — paper white panel like hermes install box */}
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
          Use the top bar to connect · join groups · send messages
        </p>
      </div>

      {/* feature grid — 3 images like hermes feature section */}
      <div className="hv-features">
        {[
          { img: '/img/feature-connect.jpg',    label: '#1 Connect',  title: 'Find Peers' },
          { img: '/img/feature-memory.jpg',     label: '#2 Message',  title: 'Private DMs' },
          { img: '/img/feature-automation.jpg', label: '#3 Groups',   title: 'Collaborate' },
        ].map(f => (
          <div key={f.label} className="hv-feat hw-noise hw-vignette hw-arc-parent">
            <span className="hw-arc" aria-hidden />
            <img src={f.img} alt="" aria-hidden className="hv-feat-img" />
            <div className="hv-feat-body">
              <p className="hv-feat-eyebrow hw-mono">{f.label}</p>
              <h3 className="hv-feat-title">{f.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
