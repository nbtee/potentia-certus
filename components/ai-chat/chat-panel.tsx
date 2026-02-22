'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Sparkles } from 'lucide-react';
import { ChatContent } from './chat-content';

interface ChatPanelProps {
  dashboardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatPanel({ dashboardId, open, onOpenChange }: ChatPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        {/* Header */}
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-purple-500" />
            AI Assistant
          </SheetTitle>
          <SheetDescription className="text-xs">
            Ask questions about your data or request new widgets
          </SheetDescription>
        </SheetHeader>

        <ChatContent dashboardId={dashboardId} />
      </SheetContent>
    </Sheet>
  );
}
