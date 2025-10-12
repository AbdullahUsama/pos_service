"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Trash2, Calendar, Clock } from 'lucide-react';
import { Note } from '@/lib/types/database';

interface PreviousNotesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onDelete: (noteId: string) => Promise<void>;
  isLoading: boolean;
}

export default function PreviousNotesPopup({ 
  isOpen, 
  onClose, 
  notes, 
  onDelete, 
  isLoading 
}: PreviousNotesPopupProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (noteId: string) => {
    setDeletingId(noteId);
    try {
      await onDelete(noteId);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Previous Notes</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {notes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No notes found</p>
              <p className="text-sm text-gray-500 mt-1">Start adding notes to keep track of your shift information</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors"
                >
                  {/* Note Header */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-white text-lg">{note.title}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(note.id)}
                      disabled={deletingId === note.id || isLoading}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20 ml-2"
                    >
                      {deletingId === note.id ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Note Content */}
                  <div className="mb-3">
                    <p className="text-gray-300 whitespace-pre-wrap">{note.content}</p>
                  </div>

                  {/* Note Footer */}
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(note.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(note.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-700">
          <Button
            onClick={onClose}
            className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}