"use client";

import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

interface FloatingCartButtonProps {
  cartCount: number;
  onClick: () => void;
}

export default function FloatingCartButton({ cartCount, onClick }: FloatingCartButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-card hover:bg-accent text-foreground shadow-lg hover:shadow-xl transition-all duration-200 z-40 lg:hidden flex items-center justify-center border border-border backdrop-blur-sm"
      size="lg"
    >
      <div className="relative">
        <ShoppingCart className="h-6 w-6" />
        {cartCount > 0 && (
          <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold border-2 border-card shadow-sm">
            {cartCount > 99 ? '99+' : cartCount}
          </div>
        )}
      </div>
    </Button>
  );
}