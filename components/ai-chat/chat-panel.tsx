'use client';

import { useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendHorizonal, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { ChatMessage } from './chat-message';

interface ChatPanelProps {
  dashboardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatPanel({ dashboardId, open, onOpenChange }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setInput,
  } = useChat({
    api: '/api/chat',
    body: { dashboardId },
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  const isApiMissing = error?.message?.includes('AI is not configured');
  const isRateLimited = error?.message?.includes('Rate limit');

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

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        >
          {messages.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 text-sm px-4">
              <Sparkles className="h-8 w-8 mb-3 text-purple-300" />
              <p className="font-medium text-gray-500">How can I help?</p>
              <p className="mt-1 text-xs max-w-[240px]">
                Try &quot;Show me submittals this quarter&quot; or &quot;How many client visits did the team make?&quot;
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              dashboardId={dashboardId}
              isLast={index === messages.length - 1}
            />
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
              Thinking...
            </div>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              {isApiMissing ? (
                <p>AI is not configured yet. An administrator needs to set the ANTHROPIC_API_KEY environment variable.</p>
              ) : isRateLimited ? (
                <p>You&apos;ve sent too many messages. Please wait a moment before trying again.</p>
              ) : (
                <p>Something went wrong. Please try again.</p>
              )}
            </div>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t px-4 py-3"
        >
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your data..."
              className="min-h-[40px] max-h-[120px] resize-none text-sm"
              rows={1}
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
