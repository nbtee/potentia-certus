'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { useContextDocuments, useUpdateContextDocument } from '@/lib/admin/hooks';
import type { ContextDocument } from '@/lib/admin/types';
import { FileText, Pencil } from 'lucide-react';

const typeLabels: Record<string, string> = {
  business_vernacular: 'Business Vernacular',
  leading_lagging_indicators: 'Leading & Lagging Indicators',
  motivation_framework: 'Motivation Framework',
  metric_relationships: 'Metric Relationships',
};

export function ContextDocEditor() {
  const { data: docs, isLoading } = useContextDocuments();
  const updateMutation = useUpdateContextDocument();

  const [editingDoc, setEditingDoc] = useState<ContextDocument | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  function openEdit(doc: ContextDocument) {
    setEditingDoc(doc);
    setTitle(doc.title);
    setContent(doc.content);
  }

  async function handleSave() {
    if (!editingDoc) return;
    await updateMutation.mutateAsync({
      id: editingDoc.id,
      title,
      content,
    });
    setEditingDoc(null);
  }

  const tokenEstimate = Math.ceil(content.length / 4);

  if (isLoading) {
    return (
      <div>
        <AdminPageHeader title="Context Documents" description="Markdown documents injected into AI system prompt." />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Context Documents"
        description="These 4 Markdown documents are injected into the AI system prompt for query understanding."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {(docs ?? []).map((doc) => (
          <Card key={doc.id} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <CardTitle className="text-sm font-medium">
                  {typeLabels[doc.document_type] ?? doc.document_type}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEdit(doc)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-gray-900">{doc.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                {doc.content || 'No content yet'}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  v{doc.version}
                </Badge>
                <span className="text-xs text-gray-400">
                  ~{Math.ceil(doc.content.length / 4)} tokens
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editingDoc} onOpenChange={(open) => !open && setEditingDoc(null)}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              Edit: {editingDoc ? typeLabels[editingDoc.document_type] ?? editingDoc.document_type : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Content (Markdown)</Label>
                <span className="text-xs text-gray-400">
                  ~{tokenEstimate.toLocaleString()} tokens
                </span>
              </div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            {editingDoc && (
              <p className="text-xs text-gray-400">
                Current version: v{editingDoc.version}. Saving will create v{editingDoc.version + 1}.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDoc(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || !content.trim()}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
