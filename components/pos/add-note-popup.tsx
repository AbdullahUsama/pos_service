"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface AddNotePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, content: string) => Promise<void>;
  isLoading: boolean;
}

export default function AddNotePopup({ isOpen, onClose, onSave, isLoading }: AddNotePopupProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      return;
    }
    
    await onSave(title, content);
    setTitle('');
    setContent('');
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md border-2 border-border dark:border-[3px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-border dark:border-b-[3px]">
          <h2 className="text-lg font-semibold text-foreground">Add Shift Note</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <Label htmlFor="title" className="text-foreground">
              Title
            </Label>
            <Input
              id="title"
              placeholder="e.g., Inventory, Logistics, Keys Location, etc."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="content" className="text-foreground">
              Content
            </Label>
            <textarea
              id="content"
              placeholder="Enter your shift note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1 w-full h-32 px-3 py-2 bg-background border-2 border-border dark:border-[3px] rounded-md text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t-2 border-border dark:border-t-[3px]">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="border-2 dark:border-[3px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !title.trim() || !content.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white border-2 dark:border-[3px] border-blue-600"
          >
            {isLoading ? 'Saving...' : 'Save Note'}
          </Button>
        </div>
      </div>
    </div>
  );
}
