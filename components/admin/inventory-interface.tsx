"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Item } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface InventoryInterfaceProps {
  userEmail: string;
}

export default function InventoryInterface({ userEmail }: InventoryInterfaceProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [newItem, setNewItem] = useState({ name: '', price: '' });
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
    if (!newItem.name || !newItem.price) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('items')
        .insert({
          name: newItem.name,
          price: parseFloat(newItem.price)
        });
      
      if (error) throw error;
      
      setNewItem({ name: '', price: '' });
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
      const { error } = await supabase
        .from('items')
        .update({
          name: editingItem.name,
          price: editingItem.price
        })
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

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToAdmin = () => {
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700 px-3 sm:px-4 lg:px-6 py-3 lg:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            onClick={handleBackToAdmin}
            className="flex items-center justify-center gap-2 bg-gray-700 text-white border-gray-600 hover:bg-gray-600 w-full sm:w-auto text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
          <div className="text-center sm:text-left">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Inventory Management</h1>
            <p className="text-xs text-gray-400">Logged in as: {userEmail}</p>
          </div>
        </div>
      </header>

      <div className="p-3 sm:p-4 lg:p-6">
        {/* Item Management Section */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-white text-lg sm:text-xl text-center sm:text-left">
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
              <div className="mb-4 lg:mb-6 p-4 lg:p-6 bg-gray-700 rounded-lg border border-gray-600">
                <h3 className="text-lg font-semibold mb-4 text-white">Add New Item</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="new-name" className="text-gray-300 text-sm font-medium mb-2 block">Item Name</Label>
                    <Input
                      id="new-name"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="Enter item name"
                      className="bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-price" className="text-gray-300 text-sm font-medium mb-2 block">Price ($)</Label>
                    <Input
                      id="new-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                      placeholder="0.00"
                      className="bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddingItem(false);
                      setNewItem({ name: '', price: '' });
                    }}
                    className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500 px-6 py-2 order-2 sm:order-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddItem} 
                    disabled={isLoading || !newItem.name || !newItem.price} 
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
                <div className="text-center py-12 text-gray-400">
                  <div className="mb-4">
                    <Package className="h-12 w-12 mx-auto text-gray-500 mb-2" />
                  </div>
                  <p className="text-lg mb-1">No items in inventory yet</p>
                  <p className="text-sm">Click "Add New Item" to get started</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="bg-gray-700 border border-gray-600 rounded-lg overflow-hidden">
                    {editingItem?.id === item.id ? (
                      <div className="p-4">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-gray-300 text-sm font-medium mb-2 block">Item Name</Label>
                            <Input
                              value={editingItem.name}
                              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                              className="bg-gray-600 border-gray-500 text-white focus:border-blue-400 focus:ring-blue-400"
                              placeholder="Item name"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-300 text-sm font-medium mb-2 block">Price ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingItem.price}
                              onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
                              className="bg-gray-600 border-gray-500 text-white focus:border-blue-400 focus:ring-blue-400"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setEditingItem(null)} 
                              className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500 order-2 sm:order-1"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={handleUpdateItem} 
                              disabled={isLoading || !editingItem.name || editingItem.price <= 0} 
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
                            <h4 className="font-semibold text-white text-base truncate">{item.name}</h4>
                            <p className="text-sm text-gray-300 mt-1">{formatCurrency(item.price)}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingItem(item)}
                              className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500 flex-1 sm:flex-none"
                            >
                              <Edit className="h-4 w-4 sm:mr-0 mr-2" />
                              <span className="sm:hidden">Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteItem(item.id)}
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
    </div>
  );
}