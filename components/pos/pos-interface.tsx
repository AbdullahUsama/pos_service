"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Item, CartItem, Note } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
      // First, validate that all items with quantity tracking have enough stock
      for (const cartItem of cart) {
        const { data: itemData, error: itemError } = await supabase
          .from('items')
          .select('quantity, name')
          .eq('id', cartItem.id)
          .single();
        
        if (itemError) {
          console.error('Error validating item stock:', itemError);
          throw new Error(`Could not validate stock for ${cartItem.name}`);
        }
        
        // Check if item has quantity tracking and sufficient stock
        if (itemData?.quantity !== null && itemData?.quantity !== undefined) {
          if (itemData.quantity < cartItem.quantity) {
            throw new Error(`Insufficient stock for ${itemData.name}. Available: ${itemData.quantity}, Requested: ${cartItem.quantity}`);
          }
        }
      }
      
      // Record the sale
      const { error: salesError } = await supabase
        .from('sales')
        .insert({
          cashier_id: userId,
          total_amount: getTotalAmount(),
          payment_method: paymentMethod,
          cart_details: cart
        });
      
      if (salesError) throw salesError;
      
      // Update inventory quantities for items that have quantity tracking
      for (const cartItem of cart) {
        console.log(`Processing item: ${cartItem.name}, quantity in cart: ${cartItem.quantity}`);
        
        // Get current item data to check if it has quantity tracking
        const { data: itemData, error: itemError } = await supabase
          .from('items')
          .select('quantity')
          .eq('id', cartItem.id)
          .single();
        
        if (itemError) {
          console.error('Error fetching item for quantity update:', itemError);
          continue; // Continue with other items even if one fails
        }
        
        console.log(`Current quantity in DB: ${itemData?.quantity}`);
        
        // Only update if item has quantity tracking (not null)
        if (itemData?.quantity !== null && itemData?.quantity !== undefined) {
          const newQuantity = Math.max(0, itemData.quantity - cartItem.quantity);
          console.log(`Updating quantity from ${itemData.quantity} to ${newQuantity}`);
          
          const { data: updateData, error: updateError } = await supabase
            .from('items')
            .update({ quantity: newQuantity })
            .eq('id', cartItem.id)
            .select(); // Add select to return updated data
          
          if (updateError) {
            console.error('Error updating item quantity:', updateError);
            console.error(`Failed to update quantity for ${cartItem.name}:`, updateError);
          } else if (updateData && updateData.length > 0) {
            console.log(`Successfully updated ${cartItem.name} quantity to ${newQuantity}. DB response:`, updateData[0]);
          } else {
            console.error(`Update appeared successful but no rows were affected for ${cartItem.name}`);
            console.log('Update response:', updateData);
          }
          
          // Verify the update by fetching the item again
          const { data: verifyData, error: verifyError } = await supabase
            .from('items')
            .select('quantity')
            .eq('id', cartItem.id)
            .single();
          
          if (!verifyError && verifyData) {
            console.log(`Verification: ${cartItem.name} quantity in DB is now: ${verifyData.quantity}`);
          } else {
            console.error('Error verifying update:', verifyError);
          }
        } else {
          console.log(`Item ${cartItem.name} has no quantity tracking (unlimited stock)`);
        }
      }
      
      setCart([]);
      setSuccessMessage(`Sale Complete! Payment: ${paymentMethod}`);
      fetchTodaysStats(); // Refresh stats
      fetchItems(); // Refresh items to get updated quantities
      
      setTimeout(() => setSuccessMessage(''), 1500);
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
    <div className="flex flex-col lg:flex-row h-screen bg-gray-900">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 shadow-sm border-b border-gray-700 px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white">Khappa POS</h1>
              <p className="text-xs text-gray-400">Logged in as: {userEmail}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:gap-4">
              <div className="text-center sm:text-right">
                <div className="text-xs lg:text-sm text-gray-300">Today&apos;s Sales</div>
                <div className="text-sm lg:text-lg font-semibold text-green-400">{formatCurrency(todaysStats.totalSales)}</div>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-xs lg:text-sm text-gray-300">Items Sold</div>
                <div className="text-sm lg:text-lg font-semibold text-blue-400">{todaysStats.itemsSold}</div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 bg-gray-700 text-white border-gray-600 hover:bg-gray-600 text-xs lg:text-sm px-2 lg:px-4"
                  >
                    <StickyNote className="h-3 w-3 lg:h-4 lg:w-4" />
                    <span className="hidden sm:inline">Notes</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-gray-700">
                  <DropdownMenuItem 
                    onClick={() => handleNotesDropdown('add')}
                    className="text-white hover:bg-gray-700 cursor-pointer"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Add Note
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleNotesDropdown('previous')}
                    className="text-white hover:bg-gray-700 cursor-pointer"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Previous Notes
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center gap-2 bg-gray-700 text-white border-gray-600 hover:bg-gray-600 text-xs lg:text-sm px-2 lg:px-4"
              >
                <LogOut className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Items Section */}
          <div className="flex-1 p-3 lg:p-6 bg-gray-900 overflow-y-auto">
            <div className="mb-4 lg:mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
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
                    className={`cursor-pointer hover:shadow-md transition-shadow border-gray-700 ${
                      isOutOfStock 
                        ? 'bg-gray-800 opacity-50 cursor-not-allowed' 
                        : 'bg-gray-800 hover:bg-gray-750'
                    }`}
                    onClick={() => !isOutOfStock && addToCart(item)}
                  >
                    <CardContent className="p-3 lg:p-4">
                      <h3 className="font-semibold text-sm lg:text-lg mb-1 lg:mb-2 text-white line-clamp-2">{item.name}</h3>
                      <p className="text-lg lg:text-xl font-bold text-green-400 mb-1">
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

          {/* Cart Section */}
          <div className="w-full lg:w-96 bg-gray-800 shadow-lg border-t lg:border-t-0 lg:border-l border-gray-700 flex flex-col max-h-96 lg:max-h-none">
            <div className="p-4 lg:p-6 border-b border-gray-700">
              <h2 className="text-lg lg:text-xl font-bold flex items-center gap-2 text-white">
                <ShoppingCart className="h-4 w-4 lg:h-5 lg:w-5" />
                Cart ({cart.length})
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              {cart.length === 0 ? (
                <p className="text-gray-400 text-center text-sm lg:text-base">Cart is empty</p>
              ) : (
                <div className="space-y-3 lg:space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 lg:p-3 bg-gray-700 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white text-sm lg:text-base truncate">{item.name}</h4>
                        <p className="text-xs lg:text-sm text-gray-300">{formatCurrency(item.price)} each</p>
                      </div>
                      <div className="flex items-center gap-1 lg:gap-2 ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500 h-6 w-6 lg:h-8 lg:w-8 p-0"
                        >
                          <Minus className="h-2 w-2 lg:h-3 lg:w-3" />
                        </Button>
                        <span className="w-6 lg:w-8 text-center text-white text-sm lg:text-base">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500 h-6 w-6 lg:h-8 lg:w-8 p-0"
                        >
                          <Plus className="h-2 w-2 lg:h-3 lg:w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFromCart(item.id)}
                          className="bg-red-600 hover:bg-red-700 h-6 w-6 lg:h-8 lg:w-8 p-0"
                        >
                          <Trash2 className="h-2 w-2 lg:h-3 lg:w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Success Message - Always visible when present */}
            {successMessage && (
              <div className="p-4 lg:p-6 border-t border-gray-700 bg-gray-750">
                <div className="p-3 bg-green-800 text-green-200 rounded-lg text-center text-sm lg:text-base border border-green-700 animate-pulse">
                  {successMessage}
                </div>
              </div>
            )}

            {/* Checkout Section */}
            {cart.length > 0 && (
              <div className="p-4 lg:p-6 border-t border-gray-700 bg-gray-750">
                <div className="mb-3 lg:mb-4">
                  <div className="flex justify-between items-center text-lg lg:text-xl font-bold text-white">
                    <span>Total:</span>
                    <span className="text-green-400">{formatCurrency(getTotalAmount())}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm lg:text-base py-2 lg:py-3"
                    size="lg"
                    onClick={() => handleCheckout('Cash')}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Cash Payment'}
                  </Button>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm lg:text-base py-2 lg:py-3"
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