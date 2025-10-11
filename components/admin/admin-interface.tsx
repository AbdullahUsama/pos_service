"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Item, Sale } from '@/lib/types/database';
import { formatCurrency, formatDate } from '@/lib/utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LogOut, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AdminInterfaceProps {
  userId: string;
  userEmail: string;
}

export default function AdminInterface({ userId, userEmail }: AdminInterfaceProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [newItem, setNewItem] = useState({ name: '', price: '' });
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [salesFilter, setSalesFilter] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchItems();
    fetchSales();
    
    // Subscribe to real-time sales updates
    const salesSubscription = supabase
      .channel('sales_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'sales' },
        () => {
          fetchSales();
        }
      )
      .subscribe();

    return () => {
      salesSubscription.unsubscribe();
    };
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

  const [cashierEmails, setCashierEmails] = useState<Record<string, string>>({});

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching sales:', error);
    } else {
      setSales(data || []);
      
      // Fetch cashier emails for unique cashier IDs
      const uniqueCashierIds = [...new Set((data || []).map(sale => sale.cashier_id))];
      
      if (uniqueCashierIds.length > 0) {
        console.log('Fetching emails for cashier IDs:', uniqueCashierIds);
        try {
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userIds: uniqueCashierIds }),
          });
          
          console.log('API response status:', response.status);
          
          if (response.ok) {
            const { userEmails } = await response.json();
            console.log('Received user emails:', userEmails);
            setCashierEmails(userEmails);
          } else {
            const errorData = await response.json();
            console.error('Failed to fetch user emails:', errorData);
          }
        } catch (error) {
          console.error('Error fetching user emails:', error);
        }
      }
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const filteredSales = sales.filter(sale => {
    if (!salesFilter) return true;
    const cashierEmail = cashierEmails[sale.cashier_id] || '';
    return sale.cashier_id.includes(salesFilter) ||
           cashierEmail.toLowerCase().includes(salesFilter.toLowerCase()) ||
           sale.payment_method.toLowerCase().includes(salesFilter.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700 px-4 lg:px-6 py-3 lg:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-xs lg:text-sm text-gray-300">University Snack Shop Management</p>
            <p className="text-xs text-gray-400">Logged in as: {userEmail}</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2 bg-gray-700 text-white border-gray-600 hover:bg-gray-600 self-start sm:self-auto"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
        {/* Item Management Section */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-white text-lg lg:text-xl">Item Management</CardTitle>
            <Button
              onClick={() => setIsAddingItem(!isAddingItem)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {/* Add New Item Form */}
            {isAddingItem && (
              <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-gray-700 rounded-lg">
                <h3 className="text-base lg:text-lg font-semibold mb-3 lg:mb-4 text-white">Add New Item</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="new-name" className="text-gray-300 text-sm">Name</Label>
                    <Input
                      id="new-name"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="Item name"
                      className="bg-gray-600 border-gray-500 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-price" className="text-gray-300 text-sm">Price</Label>
                    <Input
                      id="new-price"
                      type="number"
                      step="0.01"
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                      placeholder="0.00"
                      className="bg-gray-600 border-gray-500 text-white placeholder-gray-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddItem} disabled={isLoading} className="bg-green-600 hover:bg-green-700 flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddingItem(false);
                        setNewItem({ name: '', price: '' });
                      }}
                      className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500 flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-700 border border-gray-600 rounded-lg gap-3">
                  {editingItem?.id === item.id ? (
                    <div className="flex-1 grid grid-cols-1 gap-3">
                      <Input
                        value={editingItem.name}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        className="bg-gray-600 border-gray-500 text-white"
                        placeholder="Item name"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={editingItem.price}
                        onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
                        className="bg-gray-600 border-gray-500 text-white"
                        placeholder="Price"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleUpdateItem} disabled={isLoading} className="bg-green-600 hover:bg-green-700 flex-1">
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(null)} className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500 flex-1">
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <h4 className="font-medium text-white text-sm lg:text-base">{item.name}</h4>
                        <p className="text-xs lg:text-sm text-gray-300">{formatCurrency(item.price)}</p>
                      </div>
                      <div className="flex gap-2 self-start sm:self-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingItem(item)}
                          className="bg-gray-600 border-gray-500 text-white hover:bg-gray-500"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={isLoading}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sales Reporting Section */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg lg:text-xl">Sales Reports</CardTitle>
            <div className="w-full">
              <Input
                placeholder="Filter by cashier email or payment method..."
                value={salesFilter}
                onChange={(e) => setSalesFilter(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="text-left p-2 text-gray-300">Date/Time</th>
                      <th className="text-left p-2 text-gray-300">Cashier</th>
                      <th className="text-left p-2 text-gray-300">Total Amount</th>
                      <th className="text-left p-2 text-gray-300">Payment Method</th>
                      <th className="text-left p-2 text-gray-300">Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="border-b border-gray-700">
                        <td className="p-2 text-white">{formatDate(sale.created_at)}</td>
                        <td className="p-2 text-gray-300">
                          {cashierEmails[sale.cashier_id] || 'Loading...'}
                        </td>
                        <td className="p-2 font-semibold text-green-400">{formatCurrency(sale.total_amount)}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            sale.payment_method === 'Cash' 
                              ? 'bg-green-800 text-green-200' 
                              : 'bg-blue-800 text-blue-200'
                          }`}>
                            {sale.payment_method}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="text-xs text-gray-300">
                            {sale.cart_details.map((item, index) => (
                              <div key={index}>
                                {item.name} x{item.quantity}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile view */}
              <div className="md:hidden space-y-3">
                {filteredSales.map((sale) => (
                  <div key={sale.id} className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs text-gray-300">{formatDate(sale.created_at)}</div>
                      <div className="font-semibold text-green-400">{formatCurrency(sale.total_amount)}</div>
                    </div>
                    
                    <div className="mb-2">
                      <div className="text-sm text-white">
                        {cashierEmails[sale.cashier_id] || `Cashier ${sale.cashier_id.slice(0, 8)}...`}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {sale.cashier_id.slice(0, 8)}...
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        sale.payment_method === 'Cash' 
                          ? 'bg-green-800 text-green-200' 
                          : 'bg-blue-800 text-blue-200'
                      }`}>
                        {sale.payment_method}
                      </span>
                    </div>

                    <div className="text-xs text-gray-300">
                      <div className="font-medium mb-1">Items:</div>
                      {sale.cart_details.map((item, index) => (
                        <div key={index} className="ml-2">
                          {item.name} x{item.quantity}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {filteredSales.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No sales found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}