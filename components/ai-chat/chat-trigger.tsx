'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatPanel } from './chat-panel';

interface ChatTriggerProps {
  dashboardId: string;
}

export function ChatTrigger({ dashboardId }: ChatTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        title="Ask AI"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      <ChatPanel
        dashboardId={dashboardId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
