"use client";

import { CartItem } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils/auth';
import { Button } from '@/components/ui/button';
import { X, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';

interface MobileCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckout: (paymentMethod: 'Cash' | 'Transfer') => void;
  isLoading: boolean;
  successMessage: string;
}

export default function MobileCartModal({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  isLoading,
  successMessage
}: MobileCartModalProps) {
  if (!isOpen) return null;

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-card w-full max-h-[85vh] rounded-t-lg shadow-lg flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-border dark:border-b-[3px]">
          <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <ShoppingCart className="h-5 w-5" />
            Cart ({cart.length})
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border dark:border-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm truncate">{item.name}</h4>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} each</p>
                    <p className="text-xs font-medium text-green-600 dark:text-green-400">
                      Subtotal: {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="h-8 w-8 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-foreground text-sm font-medium">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onRemoveItem(item.id)}
                      className="h-8 w-8 p-0 ml-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="p-4 border-t-2 border-border dark:border-t-[3px]">
            <div className="p-3 bg-green-800 text-green-200 rounded-lg text-center text-sm border-2 border-green-700 animate-pulse">
              {successMessage}
            </div>
          </div>
        )}

        {/* Checkout Section */}
        {cart.length > 0 && (
          <div className="p-4 border-t-2 border-border dark:border-t-[3px]">
            <div className="mb-4">
              <div className="flex justify-between items-center text-xl font-bold text-foreground">
                <span>Total:</span>
                <span className="text-green-600 dark:text-green-400">{formatCurrency(getTotalAmount())}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                size="lg"
                onClick={() => onCheckout('Cash')}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Cash Payment'}
              </Button>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                variant="outline"
                size="lg"
                onClick={() => onCheckout('Transfer')}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Transfer Payment'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}