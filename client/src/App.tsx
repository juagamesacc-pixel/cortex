import React from 'react';
import { MainLayout } from './ui/layouts/MainLayout';
import { ChatView } from './ui/components/chat/ChatView';
import { InputBar } from './ui/components/chat/InputBar';
import { useAgent } from './ui/hooks/useAgent';
import { useSettingsStore } from './ui/stores/settingsStore';

export function App() {
  const { runTask } = useAgent();
  const { setActivePanel } = useSettingsStore();

  return (
    <MainLayout>
      <ChatView onOpenPlan={() => setActivePanel('plan')} />
      <InputBar onSend={runTask} />
    </MainLayout>
  );
}

export default App;
