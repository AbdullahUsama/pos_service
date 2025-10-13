"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/auth';
import { Note } from '@/lib/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut, Package, BarChart3, Users, DollarSign, Plus, X, StickyNote, FileText, Trash2, Calendar, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AdminInterfaceProps {
  userEmail: string;
}

export default function AdminInterface({ userEmail }: AdminInterfaceProps) {
  const [stats, setStats] = useState({
    totalItems: 0,
    totalSales: 0,
    todaySales: 0,
    totalCashiers: 0
  });
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Notes state
  const [showNotesView, setShowNotesView] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showAddUserForm) {
        setShowAddUserForm(false);
      }
    };

    if (showAddUserForm) {
      document.addEventListener('keydown', handleEscape);
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showAddUserForm]);

  const fetchStats = async () => {
    try {
      // Fetch total items
      const { count: itemCount } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true });

      // Fetch total sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount');

      // Fetch today's sales
      const today = new Date().toISOString().split('T')[0];
      const { data: todaysSalesData } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      // Fetch unique cashiers
      const { data: cashierData } = await supabase
        .from('sales')
        .select('cashier_id');

      const uniqueCashiers = new Set(cashierData?.map(sale => sale.cashier_id) || []).size;
      const totalSales = salesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const todaySales = todaysSalesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;

      setStats({
        totalItems: itemCount || 0,
        totalSales,
        todaySales,
        totalCashiers: uniqueCashiers
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: 'cashier'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Cashier created successfully! Email: ${data.user.email}`);
        setFormData({ email: '', password: '' });
        setShowAddUserForm(false);
        fetchStats(); // Refresh stats to update cashier count
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToInventory = () => {
    router.push('/admin/inventory');
  };

  const navigateToSalesReport = () => {
    router.push('/admin/sales');
  };

  const navigateToAnalytics = () => {
    router.push('/admin/analytics');
  };

  // Notes functions
  const fetchAllNotes = async () => {
    setNotesLoading(true);
    try {
      // First, fetch all notes
      const { data: notesData, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching notes:', error);
        return;
      }

      if (notesData && notesData.length > 0) {
        // Get unique cashier IDs
        const uniqueCashierIds = [...new Set(notesData.map(note => note.cashier_id))];
        
        try {
          // Fetch cashier emails using the existing API
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userIds: uniqueCashierIds }),
          });
          
          if (response.ok) {
            const { userEmails } = await response.json();
            
            // Map notes with emails
            const notesWithEmail = notesData.map(note => ({
              ...note,
              cashier_email: userEmails[note.cashier_id] || 'Unknown'
            }));
            
            setNotes(notesWithEmail);
          } else {
            console.error('Failed to fetch user emails');
            // Fallback: set notes without emails
            const notesWithEmail = notesData.map(note => ({
              ...note,
              cashier_email: 'Unknown'
            }));
            setNotes(notesWithEmail);
          }
        } catch (emailError) {
          console.error('Error fetching user emails:', emailError);
          // Fallback: set notes without emails
          const notesWithEmail = notesData.map(note => ({
            ...note,
            cashier_email: 'Unknown'
          }));
          setNotes(notesWithEmail);
        }
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleViewNotes = () => {
    setShowNotesView(true);
    fetchAllNotes();
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

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700 px-4 lg:px-6 py-3 lg:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-xs lg:text-sm text-gray-300">University Snack Shop Management</p>
            <p className="text-xs text-gray-400">Logged in as: {userEmail}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddUserForm(!showAddUserForm)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Cashier
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2 bg-gray-700 text-white border-gray-600 hover:bg-gray-600 self-start sm:self-auto"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Add User Modal */}
      {showAddUserForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddUserForm(false)}
        >
          <div 
            className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Add New Cashier</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddUserForm(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-gray-300">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                      required
                      placeholder="Enter cashier email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-gray-300">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                      required
                      minLength={6}
                      placeholder="Enter password (min 6 characters)"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 flex-1"
                  >
                    {isLoading ? 'Creating...' : 'Create Cashier'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddUserForm(false)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 lg:p-6">
        {/* Success/Error Messages */}
        {message && (
          <div className="mb-4 p-3 bg-green-800 text-green-200 rounded-lg text-sm">
            {message}
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-800 text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Items</p>
                  <p className="text-2xl font-bold text-slate-300">{stats.totalItems}</p>
                </div>
                <Package className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Sales</p>
                  <p className="text-2xl font-bold text-emerald-300">{formatCurrency(stats.totalSales)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Today's Sales</p>
                  <p className="text-2xl font-bold text-amber-300">{formatCurrency(stats.todaySales)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Cashiers</p>
                  <p className="text-2xl font-bold text-indigo-300">{stats.totalCashiers}</p>
                </div>
                <Users className="h-8 w-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Inventory Management Card */}
          <Card 
            className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
            onClick={navigateToInventory}
          >
            <CardContent className="text-center p-8">
              <div className="mx-auto bg-slate-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Package className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-white text-xl font-semibold mb-6">Inventory Management</h3>
              <Button className="bg-slate-600 hover:bg-slate-500 text-white w-full">
                Manage Inventory
              </Button>
            </CardContent>
          </Card>

          {/* Sales Report Card */}
          <Card 
            className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
            onClick={navigateToSalesReport}
          >
            <CardContent className="text-center p-8">
              <div className="mx-auto bg-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-white text-xl font-semibold mb-6">Sales Reports</h3>
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white w-full">
                View Reports
              </Button>
            </CardContent>
          </Card>

          {/* Notes Management Card */}
          <Card 
            className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
            onClick={handleViewNotes}
          >
            <CardContent className="text-center p-8">
              <div className="mx-auto bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <StickyNote className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-white text-xl font-semibold mb-6">View Notes</h3>
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white w-full">
                View All Notes
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Notes Modal */}
        {showNotesView && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] border border-gray-700 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">All Cashier Notes</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotesView(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {notesLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading notes...</p>
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No notes found</p>
                    <p className="text-sm text-gray-500 mt-1">Cashiers haven't added any notes yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                      >
                        {/* Note Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium text-white text-lg">{note.title}</h3>
                            <p className="text-sm text-gray-400">by {note.cashier_email}</p>
                          </div>
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

                        {/* Note Content */}
                        <div className="mt-3">
                          <p className="text-gray-300 whitespace-pre-wrap">{note.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end p-4 border-t border-gray-700">
                <Button
                  onClick={() => setShowNotesView(false)}
                  className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}