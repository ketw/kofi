import React from 'react';
import { MessageSquare, Users, Wifi } from 'lucide-react';
import './WelcomeView.css';

export default function WelcomeView() {
  return (
    <div className="welcome-view">
      <div className="welcome-content">
        <div className="welcome-logo">🍵</div>
        <h1>Welcome to TeaChat</h1>
        <p className="welcome-subtitle">
          Local-first, peer-to-peer messaging — no servers, no tracking.
        </p>

        <div className="welcome-features">
          <div className="feature-card">
            <div className="feature-icon"><MessageSquare size={24} /></div>
            <h3>Spaces & Channels</h3>
            <p>Organize conversations into spaces with multiple channels and sections.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Users size={24} /></div>
            <h3>Direct Messages</h3>
            <p>Private one-on-one conversations with anyone on your network.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Wifi size={24} /></div>
            <h3>Peer to Peer</h3>
            <p>All messages stay on your local network — no cloud required.</p>
          </div>
        </div>

        <p className="welcome-hint">Select a space or DM from the sidebar to get started.</p>
      </div>
    </div>
  );
}
