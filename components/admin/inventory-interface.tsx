"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Item } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { SimpleThemeToggle } from '@/components/simple-theme-toggle';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DeleteConfirmationPopup from './delete-confirmation-popup';

interface InventoryInterfaceProps {
  userEmail: string;
}

export default function InventoryInterface({ userEmail }: InventoryInterfaceProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [newItem, setNewItem] = useState({ 
    name: '', 
    original_price: '', 
    selling_price: '', 
    quantity: '' 
  });
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    itemId: string;
    itemName: string;
  }>({ isOpen: false, itemId: '', itemName: '' });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching items:', error);
    } else {
      setItems(data || []);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.original_price || !newItem.selling_price) return;
    
    setIsLoading(true);
    
    try {
      const itemData: any = {
        name: newItem.name,
        original_price: parseFloat(newItem.original_price),
        selling_price: parseFloat(newItem.selling_price)
      };
      
      // Only add quantity if user provided a value
      if (newItem.quantity && newItem.quantity.trim() !== '') {
        itemData.quantity = parseInt(newItem.quantity);
      }
      
      const { error } = await supabase
        .from('items')
        .insert(itemData);
      
      if (error) throw error;
      
      setNewItem({ name: '', original_price: '', selling_price: '', quantity: '' });
      setIsAddingItem(false);
      fetchItems();
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    
    setIsLoading(true);
    
    try {
      const updateData: any = {
        name: editingItem.name,
        original_price: editingItem.original_price,
        selling_price: editingItem.selling_price
      };
      
      // Handle quantity - if it's undefined, null, or empty string, set it to null in database
      if (editingItem.quantity === undefined || editingItem.quantity === null || editingItem.quantity === 0) {
        updateData.quantity = null;
      } else {
        updateData.quantity = editingItem.quantity;
      }
      
      const { error } = await supabase
        .from('items')
        .update(updateData)
        .eq('id', editingItem.id);
      
      if (error) throw error;
      
      setEditingItem(null);
      fetchItems();
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    setDeleteConfirmation({
      isOpen: true,
      itemId,
      itemName
    });
  };

  const confirmDeleteItem = async () => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', deleteConfirmation.itemId);
      
      if (error) throw error;
      
      fetchItems();
      setDeleteConfirmation({ isOpen: false, itemId: '', itemName: '' });
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelDeleteItem = () => {
    setDeleteConfirmation({ isOpen: false, itemId: '', itemName: '' });
  };

  const handleBackToAdmin = () => {
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border px-3 sm:px-4 lg:px-6 py-3 lg:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={handleBackToAdmin}
              className="flex items-center justify-center gap-2 bg-secondary border-border text-foreground hover:bg-secondary/80 w-full sm:w-auto text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div className="text-center sm:text-left">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">Inventory Management</h1>
              <p className="text-xs text-muted-foreground">Logged in as: {userEmail}</p>
            </div>
          </div>
          <SimpleThemeToggle />
        </div>
      </header>

      <div className="p-3 sm:p-4 lg:p-6">
        {/* Item Management Section */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-foreground text-lg sm:text-xl text-center sm:text-left">
              Shop Items ({items.length})
            </CardTitle>
            <Button
              onClick={() => setIsAddingItem(!isAddingItem)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              <span>{isAddingItem ? 'Cancel' : 'Add New Item'}</span>
            </Button>
          </CardHeader>
          <CardContent>
            {/* Add New Item Form */}
            {isAddingItem && (
              <div className="mb-4 lg:mb-6 p-4 lg:p-6 bg-secondary/20 rounded-lg border border-border">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Add New Item</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <Label htmlFor="new-name" className="text-foreground text-sm font-medium mb-2 block">Item Name</Label>
                    <Input
                      id="new-name"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="Enter item name"
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-original-price" className="text-foreground text-sm font-medium mb-2 block">Original Price ($)</Label>
                    <Input
                      id="new-original-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newItem.original_price}
                      onChange={(e) => setNewItem({ ...newItem, original_price: e.target.value })}
                      placeholder="0.00"
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-selling-price" className="text-foreground text-sm font-medium mb-2 block">Selling Price ($)</Label>
                    <Input
                      id="new-selling-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newItem.selling_price}
                      onChange={(e) => setNewItem({ ...newItem, selling_price: e.target.value })}
                      placeholder="0.00"
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-quantity" className="text-foreground text-sm font-medium mb-2 block">
                      Total Quantity <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="new-quantity"
                      type="number"
                      min="0"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                      placeholder="Leave empty if unlimited"
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddingItem(false);
                      setNewItem({ name: '', original_price: '', selling_price: '', quantity: '' });
                    }}
                    className="bg-secondary border-border text-foreground hover:bg-secondary/80 px-6 py-2 order-2 sm:order-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddItem} 
                    disabled={isLoading || !newItem.name || !newItem.original_price || !newItem.selling_price} 
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 order-1 sm:order-2"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save Item'}
                  </Button>
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="mb-4">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  </div>
                  <p className="text-lg mb-1">No items in inventory yet</p>
                  <p className="text-sm">Click "Add New Item" to get started</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="bg-secondary/20 border border-border rounded-lg overflow-hidden">
                    {editingItem?.id === item.id ? (
                      <div className="p-4">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-foreground text-sm font-medium mb-2 block">Item Name</Label>
                            <Input
                              value={editingItem.name}
                              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                              className="bg-background border-border text-foreground focus:border-blue-400 focus:ring-blue-400"
                              placeholder="Item name"
                            />
                          </div>
                          <div>
                            <Label className="text-foreground text-sm font-medium mb-2 block">Original Price ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingItem.original_price || ''}
                              onChange={(e) => setEditingItem({ ...editingItem, original_price: e.target.value ? parseFloat(e.target.value) : 0 })}
                              className="bg-background border-border text-foreground focus:border-blue-400 focus:ring-blue-400"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label className="text-foreground text-sm font-medium mb-2 block">Selling Price ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingItem.selling_price || ''}
                              onChange={(e) => setEditingItem({ ...editingItem, selling_price: e.target.value ? parseFloat(e.target.value) : 0 })}
                              className="bg-background border-border text-foreground focus:border-blue-400 focus:ring-blue-400"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label className="text-foreground text-sm font-medium mb-2 block">
                              Total Quantity <span className="text-muted-foreground">(optional)</span>
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              value={editingItem.quantity || ''}
                              onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value ? parseInt(e.target.value) : undefined })}
                              className="bg-background border-border text-foreground focus:border-blue-400 focus:ring-blue-400"
                              placeholder="Leave empty if unlimited"
                            />
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setEditingItem(null)} 
                              className="bg-secondary border-border text-foreground hover:bg-secondary/80 order-2 sm:order-1"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={handleUpdateItem} 
                              disabled={isLoading || !editingItem.name || editingItem.original_price <= 0 || editingItem.selling_price <= 0} 
                              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 order-1 sm:order-2"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              {isLoading ? 'Saving...' : 'Save Changes'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground text-base truncate">{item.name}</h4>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                              <div className="flex flex-wrap gap-2 text-sm">
                                <span className="text-muted-foreground">
                                  Original: {formatCurrency(item.original_price)}
                                </span>
                                <span className="text-green-600 font-medium">
                                  Selling: {formatCurrency(item.selling_price)}
                                </span>
                              </div>
                              {item.quantity !== null && item.quantity !== undefined && (
                                <span className="text-xs bg-blue-600 text-blue-100 px-2 py-1 rounded-full w-fit">
                                  Stock: {item.quantity}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingItem(item)}
                              className="bg-secondary border-border text-foreground hover:bg-secondary/80 flex-1 sm:flex-none"
                            >
                              <Edit className="h-4 w-4 sm:mr-0 mr-2" />
                              <span className="sm:hidden">Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              disabled={isLoading}
                              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 flex-1 sm:flex-none"
                            >
                              <Trash2 className="h-4 w-4 sm:mr-0 mr-2" />
                              <span className="sm:hidden">Delete</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Delete Confirmation Popup */}
      <DeleteConfirmationPopup
        isOpen={deleteConfirmation.isOpen}
        onClose={cancelDeleteItem}
        onConfirm={confirmDeleteItem}
        itemName={deleteConfirmation.itemName}
        isLoading={isLoading}
      />
    </div>
  );
}