import React, { useState, useEffect } from 'react';
import SpaceBar from './components/layout/SpaceBar';
import ChannelSidebar from './components/layout/ChannelSidebar';
import DMSidebar from './components/layout/DMSidebar';
import ChatView from './components/chat/ChatView';
import DMView from './components/chat/DMView';
import WelcomeView from './components/chat/WelcomeView';
import { useStore, subscribe } from './store/appStore';
import { getSpaces, getDMs } from './store/appStore';
import './App.css';

type View =
  | { type: 'welcome' }
  | { type: 'space'; spaceId: string; channelId: string | null }
  | { type: 'dms'; dmId: string | null };

export default function App() {
  const { spaces, dms, users, currentUser } = useStore();
  const [view, setView] = useState<View>({ type: 'welcome' });

  // Select first channel of a space by default
  function openSpace(spaceId: string) {
    const space = spaces.find(s => s.id === spaceId);
    const firstChannel = space?.sections[0]?.channels[0];
    setView({ type: 'space', spaceId, channelId: firstChannel?.id ?? null });
  }

  function openDMs() {
    setView({ type: 'dms', dmId: null });
  }

  function openChannel(channelId: string) {
    if (view.type === 'space') {
      setView({ ...view, channelId });
    }
  }

  function openDM(dmId: string) {
    setView({ type: 'dms', dmId });
  }

  // Total DM unread
  const dmUnread = dms.reduce((acc, dm) => acc + (dm.unread ?? 0), 0);

  // Resolve current channel / dm
  const activeSpace = view.type === 'space' ? spaces.find(s => s.id === view.spaceId) : null;
  const activeChannel = activeSpace && view.type === 'space' && view.channelId
    ? activeSpace.sections.flatMap(s => s.channels).find(c => c.id === view.channelId)
    : null;
  const activeDM = view.type === 'dms' && view.dmId
    ? dms.find(d => d.id === view.dmId)
    : null;

  return (
    <div className="app">
      <SpaceBar
        spaces={spaces}
        selectedSpaceId={view.type === 'space' ? view.spaceId : null}
        onSelectSpace={id => id ? openSpace(id) : openDMs()}
        onOpenDMs={openDMs}
        dmUnread={dmUnread}
      />

      {/* Sidebar */}
      {view.type === 'space' && activeSpace ? (
        <ChannelSidebar
          space={activeSpace}
          selectedChannelId={view.type === 'space' ? view.channelId : null}
          onSelectChannel={openChannel}
          currentUser={currentUser}
          users={users}
        />
      ) : view.type === 'dms' ? (
        <DMSidebar
          dms={dms}
          selectedDMId={view.dmId ?? null}
          onSelectDM={openDM}
          users={users}
          currentUser={currentUser}
        />
      ) : null}

      {/* Main content */}
      {view.type === 'space' && activeSpace && activeChannel ? (
        <ChatView
          spaceId={activeSpace.id}
          channel={activeChannel}
          users={users}
          currentUser={currentUser}
        />
      ) : view.type === 'dms' && activeDM ? (
        <DMView
          dm={activeDM}
          users={users}
          currentUser={currentUser}
        />
      ) : (
        <WelcomeView />
      )}
    </div>
  );
}
