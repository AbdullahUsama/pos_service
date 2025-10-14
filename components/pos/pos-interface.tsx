"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Item, CartItem, Note } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { SimpleThemeToggle } from '@/components/simple-theme-toggle';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Search, Plus, Minus, Trash2, ShoppingCart, StickyNote, FileText, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AddNotePopup from './add-note-popup';
import PreviousNotesPopup from './previous-notes-popup';
import MobileCartModal from './mobile-cart-modal';
import FloatingCartButton from './floating-cart-button';

interface POSInterfaceProps {
  userId: string;
  userEmail: string;
}

export default function POSInterface({ userId, userEmail }: POSInterfaceProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [todaysStats, setTodaysStats] = useState({ totalSales: 0, itemsSold: 0 });
  
  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showPreviousNotes, setShowPreviousNotes] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  
  // Mobile cart state
  const [showMobileCart, setShowMobileCart] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  // Fetch items on component mount
  useEffect(() => {
    fetchItems();
    fetchTodaysStats();
  }, [userId]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching items:', error);
    } else {
      console.log('Fetched items:', data);
      setItems(data || []);
    }
  };

  const fetchTodaysStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('sales')
      .select('total_amount, cart_details')
      .eq('cashier_id', userId)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);
    
    if (error) {
      console.error('Error fetching stats:', error);
    } else {
      const totalSales = data?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const itemsSold = data?.reduce((sum, sale) => {
        return sum + sale.cart_details.reduce((itemSum: number, item: CartItem) => itemSum + item.quantity, 0);
      }, 0) || 0;
      
      setTodaysStats({ totalSales, itemsSold });
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (item: Item) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      const currentQuantityInCart = existingItem ? existingItem.quantity : 0;
      const newQuantityInCart = currentQuantityInCart + 1;
      
      // Check if item has quantity tracking and if we would exceed available stock
      if (item.quantity !== null && item.quantity !== undefined) {
        if (newQuantityInCart > item.quantity) {
          // Don't add to cart if it would exceed available stock
          console.log(`Cannot add more ${item.name}. Only ${item.quantity} available.`);
          return prevCart;
        }
      }
      
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(cartItem => {
        if (cartItem.id === itemId) {
          // Find the original item to check quantity limits
          const originalItem = items.find(item => item.id === itemId);
          
          // Check if item has quantity tracking and if new quantity would exceed available stock
          if (originalItem?.quantity !== null && originalItem?.quantity !== undefined) {
            if (quantity > originalItem.quantity) {
              // Don't allow quantity to exceed available stock
              console.log(`Cannot set quantity to ${quantity}. Only ${originalItem.quantity} available.`);
              return cartItem; // Return unchanged
            }
          }
          
          return { ...cartItem, quantity };
        }
        return cartItem;
      })
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async (paymentMethod: 'Cash' | 'Transfer') => {
    if (cart.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Call the API to process the sale
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          totalAmount: getTotalAmount(),
          paymentMethod,
          cartDetails: cart
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process sale');
      }

      // Sale was successful
      setCart([]);
      setSuccessMessage(`Sale Complete! Payment: ${paymentMethod} | Sale ID: ${result.saleId.slice(-8)}`);
      fetchTodaysStats(); // Refresh stats
      fetchItems(); // Refresh items to get updated quantities
      
      // Close mobile cart modal on successful checkout
      setShowMobileCart(false);
      
      // Log inventory updates for debugging
      if (result.inventoryUpdates) {
        console.log('Inventory updates:', result.inventoryUpdates);
      }
      
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      console.error('Error processing sale:', error);
      // Show error message to user
      setSuccessMessage(`Error: ${error instanceof Error ? error.message : 'Sale failed'}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  // Notes functions
  const fetchNotes = async () => {
    setNotesLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('cashier_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching notes:', error);
      } else {
        setNotes(data || []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleAddNote = async (title: string, content: string) => {
    setNotesLoading(true);
    try {
      const { error } = await supabase
        .from('notes')
        .insert({
          cashier_id: userId,
          title,
          content
        });
      
      if (error) {
        console.error('Error adding note:', error);
        throw error;
      }
      
      setShowAddNote(false);
      fetchNotes(); // Refresh notes list
    } catch (error) {
      console.error('Error saving note:', error);
      throw error;
    } finally {
      setNotesLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);
      
      if (error) {
        console.error('Error deleting note:', error);
        throw error;
      }
      
      fetchNotes(); // Refresh notes list
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  };

  const handleNotesDropdown = (action: 'add' | 'previous') => {
    if (action === 'add') {
      setShowAddNote(true);
    } else {
      fetchNotes();
      setShowPreviousNotes(true);
    }
  };

  // Test function to manually test quantity updates
  const testQuantityUpdate = async () => {
    console.log('Testing quantity update...');
    
    if (items.length === 0) {
      console.log('No items available for testing');
      return;
    }
    
    const testItem = items.find(item => item.quantity !== null && item.quantity !== undefined);
    if (!testItem) {
      console.log('No items with quantity tracking found for testing');
      return;
    }
    
    console.log(`Testing with item: ${testItem.name}, current quantity: ${testItem.quantity}`);
    
    const { data, error } = await supabase
      .from('items')
      .update({ quantity: testItem.quantity! - 1 })
      .eq('id', testItem.id)
      .select();
    
    if (error) {
      console.error('Test update failed:', error);
    } else {
      console.log('Test update successful:', data);
      fetchItems(); // Refresh to see the change
    }
  };

  // Add this to window for easy testing (development only)
  if (typeof window !== 'undefined') {
    (window as any).testQuantityUpdate = testQuantityUpdate;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card shadow-sm border-b-2 border-border dark:border-b-[3px] px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex flex-col gap-3">
            {/* Title and user info */}
            <div className="lg:flex lg:items-center lg:justify-between">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">Khappa POS</h1>
                <p className="text-xs text-muted-foreground">Logged in as: {userEmail}</p>
              </div>
              
              {/* Desktop-only: Stats and buttons on same row as title */}
              <div className="hidden lg:flex lg:items-center gap-6">
                {/* Sales stats */}
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Today&apos;s Sales</div>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">{formatCurrency(todaysStats.totalSales)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Items Sold</div>
                    <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{todaysStats.itemsSold}</div>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center gap-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex items-center gap-2 text-sm px-4 border-2 dark:border-[3px]"
                      >
                        <StickyNote className="h-4 w-4" />
                        <span>Notes</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem 
                        onClick={() => handleNotesDropdown('add')}
                        className="cursor-pointer"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Add Note
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleNotesDropdown('previous')}
                        className="cursor-pointer"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Previous Notes
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <SimpleThemeToggle />
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm px-4 border-2 dark:border-[3px]"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Mobile-only: Stats and buttons on separate row */}
            <div className="flex items-center justify-between gap-4 lg:hidden">
              {/* Sales stats - left side */}
              <div className="flex items-center gap-4">
                <div className="text-center sm:text-left">
                  <div className="text-xs text-muted-foreground">Today&apos;s Sales</div>
                  <div className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(todaysStats.totalSales)}</div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-xs text-muted-foreground">Items Sold</div>
                  <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">{todaysStats.itemsSold}</div>
                </div>
              </div>
              
              {/* Action buttons - right side */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 text-xs px-2 border-2 dark:border-[3px]"
                    >
                      <StickyNote className="h-3 w-3" />
                      <span className="hidden sm:inline">Notes</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem 
                      onClick={() => handleNotesDropdown('add')}
                      className="cursor-pointer"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Add Note
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleNotesDropdown('previous')}
                      className="cursor-pointer"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Previous Notes
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <SimpleThemeToggle />
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-xs px-2 border-2 dark:border-[3px]"
                >
                  <LogOut className="h-3 w-3" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Items Section */}
          <div className="flex-1 p-3 lg:p-6 bg-background overflow-y-auto">
            <div className="mb-4 lg:mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
              {filteredItems.map((item) => {
                const currentCartQuantity = cart.find(cartItem => cartItem.id === item.id)?.quantity || 0;
                const isOutOfStock = item.quantity !== null && item.quantity !== undefined && 
                  (item.quantity === 0 || currentCartQuantity >= item.quantity);
                
                return (
                  <Card
                    key={item.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      isOutOfStock 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => !isOutOfStock && addToCart(item)}
                  >
                    <CardContent className="p-3 lg:p-4">
                      <h3 className="font-semibold text-sm lg:text-lg mb-1 lg:mb-2 text-foreground line-clamp-2">{item.name}</h3>
                      <p className="text-lg lg:text-xl font-bold text-green-600 dark:text-green-400 mb-1">
                        {formatCurrency(item.price)}
                      </p>
                      {item.quantity !== null && item.quantity !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.quantity === 0 || currentCartQuantity >= item.quantity
                              ? 'bg-red-600 text-red-100'
                              : item.quantity <= 5
                              ? 'bg-yellow-600 text-yellow-100'
                              : 'bg-blue-600 text-blue-100'
                          }`}>
                            {isOutOfStock 
                              ? 'Out of Stock' 
                              : `Stock: ${item.quantity - currentCartQuantity}`
                            }
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Desktop Cart Section - Hidden on mobile */}
          <div className="hidden lg:flex w-96 bg-card shadow-lg border-l-2 border-border dark:border-l-[3px] flex-col">
            <div className="p-6 border-b-2 border-border dark:border-b-[3px]">
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <ShoppingCart className="h-5 w-5" />
                Cart ({cart.length})
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-center">Cart is empty</p>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border dark:border-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{formatCurrency(item.price)} each</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-foreground">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFromCart(item.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Success Message - Desktop */}
            {successMessage && (
              <div className="p-6 border-t-2 border-border dark:border-t-[3px]">
                <div className="p-3 bg-green-800 text-green-200 rounded-lg text-center border-2 border-green-700 animate-pulse">
                  {successMessage}
                </div>
              </div>
            )}

            {/* Checkout Section - Desktop */}
            {cart.length > 0 && (
              <div className="p-6 border-t-2 border-border dark:border-t-[3px]">
                <div className="mb-4">
                  <div className="flex justify-between items-center text-xl font-bold text-foreground">
                    <span>Total:</span>
                    <span className="text-green-600 dark:text-green-400">{formatCurrency(getTotalAmount())}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                    size="lg"
                    onClick={() => handleCheckout('Cash')}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Cash Payment'}
                  </Button>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                    variant="outline"
                    size="lg"
                    onClick={() => handleCheckout('Transfer')}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Transfer Payment'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Cart Button - Only visible on mobile */}
      <FloatingCartButton
        cartCount={cart.reduce((total, item) => total + item.quantity, 0)}
        onClick={() => setShowMobileCart(true)}
      />
      
      {/* Mobile Cart Modal */}
      <MobileCartModal
        isOpen={showMobileCart}
        onClose={() => setShowMobileCart(false)}
        cart={cart}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={handleCheckout}
        isLoading={isLoading}
        successMessage={successMessage}
      />
      
      {/* Notes Popups */}
      <AddNotePopup
        isOpen={showAddNote}
        onClose={() => setShowAddNote(false)}
        onSave={handleAddNote}
        isLoading={notesLoading}
      />
      
      <PreviousNotesPopup
        isOpen={showPreviousNotes}
        onClose={() => setShowPreviousNotes(false)}
        notes={notes}
        onDelete={handleDeleteNote}
        isLoading={notesLoading}
      />
    </div>
  );
}