'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChatContent } from './chat-content';

interface DashboardOption {
  id: string;
  name: string;
  is_template: boolean;
}

interface ChatPageContentProps {
  dashboards: DashboardOption[];
}

export function ChatPageContent({ dashboards }: ChatPageContentProps) {
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | undefined>(undefined);

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h1 className="text-lg font-semibold text-gray-900">AI Assistant</h1>
        </div>

        {/* Dashboard selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Target dashboard:</span>
          <Select
            value={selectedDashboardId ?? ''}
            onValueChange={(value) =>
              setSelectedDashboardId(value === '' ? undefined : value)
            }
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="None (Answer mode only)" />
            </SelectTrigger>
            <SelectContent>
              {dashboards.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chat content fills remaining space */}
      <ChatContent dashboardId={selectedDashboardId} />
    </div>
  );
}
