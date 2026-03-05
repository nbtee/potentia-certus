'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bookmark, Star, X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  loadFilters,
  saveFilter,
  deleteFilter,
  setDefaultFilter,
  type SavedFilter,
} from '@/lib/filters/saved-filters';
import { useFilters, type ScopePreset, type ScopeSelection } from '@/lib/contexts/filter-context';

interface FilterBookmarksProps {
  dateRangePreset: string;
  onApplyBookmark: (bookmark: SavedFilter) => void;
}

export function FilterBookmarks({ dateRangePreset, onApplyBookmark }: FilterBookmarksProps) {
  const { filters } = useFilters();
  const [bookmarks, setBookmarks] = useState<SavedFilter[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchBookmarks = useCallback(async () => {
    setIsLoading(true);
    const result = await loadFilters();
    if (result.data) setBookmarks(result.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) fetchBookmarks();
  }, [isOpen, fetchBookmarks]);

  const handleSave = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    const result = await saveFilter(newName.trim(), {
      dateRangePreset,
      scope: {
        preset: filters.scope.preset,
        selectedNodeIds: filters.scope.selectedNodeIds,
      },
    });
    if (result.data) {
      setBookmarks((prev) => [...prev, result.data]);
    }
    setNewName('');
    setShowSaveForm(false);
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteFilter(id);
    if (!result.error) {
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const handleToggleDefault = async (id: string, currentlyDefault: boolean) => {
    const newId = currentlyDefault ? null : id;
    const result = await setDefaultFilter(newId);
    if (!result.error) {
      setBookmarks((prev) =>
        prev.map((b) => ({
          ...b,
          is_default: b.id === newId,
        }))
      );
    }
  };

  const handleApply = (bookmark: SavedFilter) => {
    onApplyBookmark(bookmark);
    setIsOpen(false);
  };

  const hasDefault = bookmarks.some((b) => b.is_default);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 border-gray-200 bg-white hover:bg-gray-50"
        >
          <Bookmark className={`h-4 w-4 ${hasDefault ? 'fill-brand-primary text-brand-primary' : 'text-gray-500'}`} />
          <span className="text-sm">Bookmarks</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="border-b px-3 py-2.5">
          <h4 className="text-sm font-semibold text-gray-900">Saved Filters</h4>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-gray-500">
              No saved filters yet
            </div>
          ) : (
            <div className="divide-y">
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 group"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleDefault(bookmark.id, bookmark.is_default)}
                    className="flex-shrink-0"
                    title={bookmark.is_default ? 'Remove as default' : 'Set as default'}
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${
                        bookmark.is_default
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300 hover:text-amber-400'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    className="flex-1 text-left text-sm text-gray-700 hover:text-gray-900 truncate"
                    onClick={() => handleApply(bookmark)}
                  >
                    {bookmark.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(bookmark.id)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete bookmark"
                  >
                    <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-2">
          {showSaveForm ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Filter name..."
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setShowSaveForm(false);
                }}
              />
              <Button
                size="sm"
                className="h-8 px-3"
                disabled={!newName.trim() || isSaving}
                onClick={handleSave}
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-gray-600 hover:text-gray-900"
              onClick={() => setShowSaveForm(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Save current filters
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
