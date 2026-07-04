import React from 'react';
import { getState } from '../../store/appStore';
import './SettingsPanel.css';

export default function SettingsPanel() {
  const { me } = getState();
  if (!me) return null;

  return (
    <div className="sp">
      <div className="sp-art">
        <img src="/img/feature-sandbox.jpg" alt="" aria-hidden className="sp-art-img" />
        <span className="sp-art-label hw-mono">Local · Sovereign · Yours</span>
      </div>

      <div className="sp-body">
        <p className="sp-sec hw-mono">Identity</p>
        <div className="sp-card">
          <div className="sp-row">
            <span className="sp-key hw-mono">Username</span>
            <span className="sp-val hw-mono">@{me.username}</span>
          </div>
          <div className="sp-row">
            <span className="sp-key hw-mono">User ID</span>
            <span className="sp-val hw-mono sp-id">{me.id}</span>
          </div>
          <div className="sp-row">
            <span className="sp-key hw-mono">Status</span>
            <span className="sp-val hw-mono">{me.status}</span>
          </div>
          <div className="sp-note hw-mono">
            Permanent — bound to hardware fingerprint. Cannot be changed.
          </div>
        </div>

        <p className="sp-sec hw-mono">Network</p>
        <div className="sp-card">
          <div className="sp-row">
            <span className="sp-key hw-mono">Mode</span>
            <span className="sp-val hw-mono">Local P2P · LAN</span>
          </div>
          <div className="sp-row">
            <span className="sp-key hw-mono">Discovery</span>
            <span className="sp-val hw-mono sp-pending">Backend Pending</span>
          </div>
          <div className="sp-row">
            <span className="sp-key hw-mono">Encryption</span>
            <span className="sp-val hw-mono sp-pending">Backend Pending</span>
          </div>
        </div>

        <p className="sp-sec hw-mono">Storage</p>
        <div className="sp-card">
          <div className="sp-row">
            <span className="sp-key hw-mono">Database</span>
            <span className="sp-val hw-mono">Local SQLite</span>
          </div>
          <div className="sp-row">
            <span className="sp-key hw-mono">Path</span>
            <span className="sp-val hw-mono sp-id">./data/teachat.db</span>
          </div>
          <div className="sp-note hw-mono sp-danger">
            Deleting the db file erases your identity permanently.
          </div>
        </div>
      </div>
    </div>
  );
}
