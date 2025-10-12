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
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Add Shift Note</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <Label htmlFor="title" className="text-gray-300">
              Title
            </Label>
            <Input
              id="title"
              placeholder="e.g., Inventory, Logistics, Keys Location, etc."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="content" className="text-gray-300">
              Content
            </Label>
            <textarea
              id="content"
              placeholder="Enter your shift note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1 w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !title.trim() || !content.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? 'Saving...' : 'Save Note'}
          </Button>
        </div>
      </div>
    </div>
  );
}
