'use client';

import type { Message } from 'ai';
import { User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { BuilderApproval } from './builder-approval';
import type { BuilderResponse, AnswerResponse } from '@/lib/ai/types';

const markdownComponents: Components = {
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
      {...props}
    >
      {children}
    </a>
  ),
  pre: ({ children, ...props }) => (
    <pre
      className="my-2 overflow-x-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100"
      {...props}
    >
      {children}
    </pre>
  ),
  code: ({ children, className, ...props }) => {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return <code className={className} {...props}>{children}</code>;
    }
    return (
      <code
        className="rounded bg-teal-50 px-1 py-0.5 text-xs font-mono text-teal-800"
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ children, ...props }) => (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full border-collapse text-xs" {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th className="border border-gray-300 bg-gray-50 px-2 py-1 text-left font-medium" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border border-gray-300 px-2 py-1" {...props}>
      {children}
    </td>
  ),
};

interface ChatMessageProps {
  message: Message;
  dashboardId?: string;
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
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="chat-markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
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
            // Hide intermediate data tables — the AI synthesizes all
            // query results into its final message.content text
            return null;
          }

          return null;
        })}
      </div>
    </div>
  );
}
