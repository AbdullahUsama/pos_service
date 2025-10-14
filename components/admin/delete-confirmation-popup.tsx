"use client";

import { Button } from '@/components/ui/button';
import { X, Trash2, AlertTriangle } from 'lucide-react';

interface DeleteConfirmationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  isLoading?: boolean;
}

export default function DeleteConfirmationPopup({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName, 
  isLoading = false 
}: DeleteConfirmationPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md border-2 border-border dark:border-[3px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-border dark:border-b-[3px]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-foreground">Confirm Delete</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-foreground font-medium mb-1">
                Are you sure you want to delete this item?
              </p>
              <p className="text-sm text-muted-foreground">
                Item: <span className="font-medium text-foreground">"{itemName}"</span>
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t-2 border-border dark:border-t-[3px]">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-2 dark:border-[3px]"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white border-2 dark:border-[3px] border-red-600"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Item
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}