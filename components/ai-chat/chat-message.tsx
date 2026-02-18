'use client';

import type { Message } from 'ai';
import { User, Bot } from 'lucide-react';
import { BuilderApproval } from './builder-approval';
import type { BuilderResponse, AnswerResponse } from '@/lib/ai/types';

interface ChatMessageProps {
  message: Message;
  dashboardId: string;
  isLast: boolean;
}

export function ChatMessage({ message, dashboardId, isLast }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Extract tool results from message parts
  const toolInvocations = message.toolInvocations ?? [];

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-teal-100 text-teal-600' : 'bg-purple-100 text-purple-600'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Text content */}
        {message.content && (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              isUser
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

        {/* Tool invocation results */}
        {toolInvocations.map((invocation) => {
          if (invocation.state !== 'result') {
            return (
              <div key={invocation.toolCallId} className="flex items-center gap-2 text-sm text-gray-500">
                <div className="h-2 w-2 animate-pulse rounded-full bg-purple-400" />
                {invocation.toolName === 'create_widgets' ? 'Building widgets...' : 'Querying data...'}
              </div>
            );
          }

          const result = invocation.result as BuilderResponse | AnswerResponse;

          if (result.mode === 'builder') {
            return (
              <BuilderApproval
                key={invocation.toolCallId}
                response={result}
                dashboardId={dashboardId}
                disabled={!isLast}
              />
            );
          }

          if (result.mode === 'answer') {
            return (
              <div key={invocation.toolCallId} className="rounded-lg border bg-white p-3 text-sm">
                <p className="whitespace-pre-wrap text-gray-900">{result.answer}</p>
                {result.offer_persist && (
                  <p className="mt-2 text-xs text-gray-500 italic">
                    Tip: Ask me to &quot;add this as a widget&quot; to save it to your dashboard.
                  </p>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
