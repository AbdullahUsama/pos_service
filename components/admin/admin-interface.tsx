"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/auth';
import { Note } from '@/lib/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut, Package, BarChart3, Users, DollarSign, Plus, X, StickyNote, FileText, Trash2, Calendar, Clock, RefreshCw } from 'lucide-react';
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
  const [showManageCashiers, setShowManageCashiers] = useState(false);
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [cashiersLoading, setCashiersLoading] = useState(false);
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
  
  // Google Sheets state
  const [sheetsStatus, setSheetsStatus] = useState<{
    connected: boolean;
    message: string;
    testing: boolean;
    initializing: boolean;
  }>({
    connected: false,
    message: '',
    testing: false,
    initializing: false
  });
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
  }, []);

  // Handle escape key to close modals
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showAddUserForm) {
          setShowAddUserForm(false);
        }
        if (showManageCashiers) {
          setShowManageCashiers(false);
        }
      }
    };

    if (showAddUserForm || showManageCashiers) {
      document.addEventListener('keydown', handleEscape);
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showAddUserForm, showManageCashiers]);

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

  // Cashier management functions
  const fetchAllCashiers = async () => {
    setCashiersLoading(true);
    try {
      // Get cashiers from sales records (same approach as sales report)
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('cashier_id')
        .order('created_at', { ascending: false });

      if (salesError) {
        console.error('Error fetching sales for cashiers:', salesError);
        setError('Failed to fetch cashiers from sales records');
        return;
      }

      // Get unique cashier IDs from sales
      const uniqueCashierIds = [...new Set((salesData || []).map(sale => sale.cashier_id))];
      
      if (uniqueCashierIds.length === 0) {
        setCashiers([]);
        setCashiersLoading(false);
        return;
      }

      // Fetch display names and status for each cashier
      const cashiersList = [];
      
      for (const cashierId of uniqueCashierIds) {
        try {
          // Get display name using the same function as sales report
          const { data: displayName, error: nameError } = await supabase.rpc('get_cashier_display_name', {
            cashier_id: cashierId
          });

          if (!nameError && displayName) {
            // Check if this is an active user (not deleted)
            const isDeleted = displayName.includes('[DELETED]');
            const email = isDeleted ? displayName.replace('[DELETED] ', '') : displayName;
            
            // Try to get additional details from profiles for active users
            let role = 'cashier';
            let username = email;
            let created_at = null;
            
            if (!isDeleted) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('role, username, created_at')
                .eq('id', cashierId)
                .single();
              
              if (profileData) {
                role = profileData.role || 'cashier';
                username = profileData.username || email;
                created_at = profileData.created_at;
              }
            } else {
              // For deleted users, try to get info from deleted_users table
              const { data: deletedData } = await supabase
                .from('deleted_users')
                .select('original_role, original_username, deleted_at, created_at')
                .eq('id', cashierId)
                .single();
              
              if (deletedData) {
                role = deletedData.original_role || 'cashier';
                username = deletedData.original_username || email;
                created_at = deletedData.created_at;
              }
            }

            cashiersList.push({
              user_id: cashierId,
              email: email,
              role: role,
              username: username,
              status: isDeleted ? 'DELETED' : 'ACTIVE',
              created_at: created_at,
              deleted_at: isDeleted ? new Date() : null // Approximate, we could get exact from deleted_users
            });
          }
        } catch (err) {
          console.error('Error processing cashier:', cashierId, err);
          // Add with minimal info if there's an error
          cashiersList.push({
            user_id: cashierId,
            email: '[UNKNOWN USER]',
            role: 'cashier',
            username: '[UNKNOWN USER]',
            status: 'UNKNOWN',
            created_at: null,
            deleted_at: null
          });
        }
      }

      // Sort by created_at, with null values last
      cashiersList.sort((a, b) => {
        if (!a.created_at && !b.created_at) return 0;
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setCashiers(cashiersList);
    } catch (err) {
      console.error('Error:', err);
      setError('Network error occurred');
    } finally {
      setCashiersLoading(false);
    }
  };

  const deleteCashier = async (email: string) => {
    if (!confirm(`Are you sure you want to delete cashier: ${email}?`)) return;
    
    try {
      const { data, error } = await supabase.rpc('soft_delete_user_with_sql', {
        user_email: email,
        deleted_by_admin: userEmail,
        deletion_reason: 'Deleted by admin'
      });

      if (error) {
        console.error('Error deleting cashier:', error);
        
        // Check if it's a function not found error
        if (error.message?.includes('function') || error.code === '42883') {
          setError('Delete function not available. Please run the SQL functions in your database first.');
        } else {
          setError('Failed to delete cashier');
        }
        return;
      }

      const result = data as any;
      if (result.success) {
        setMessage(`Cashier ${email} deleted successfully. ${result.sales_records_preserved} sales records preserved.`);
        fetchAllCashiers(); // Refresh list
        fetchStats(); // Refresh stats
        setTimeout(() => setMessage(''), 5000);
      } else {
        setError(result.error || 'Failed to delete cashier');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Network error occurred');
    }
  };

  const restoreCashier = async (email: string) => {
    if (!confirm(`Are you sure you want to restore cashier: ${email}?`)) return;
    
    try {
      const { data, error } = await supabase.rpc('restore_deleted_user', {
        user_email: email,
        restored_by_admin: userEmail
      });

      if (error) {
        console.error('Error restoring cashier:', error);
        
        // Check if it's a function not found error
        if (error.message?.includes('function') || error.code === '42883') {
          setError('Restore function not available. Please run the SQL functions in your database first.');
        } else {
          setError('Failed to restore cashier');
        }
        return;
      }

      const result = data as any;
      if (result.success) {
        setMessage(`Cashier ${email} restored successfully.`);
        fetchAllCashiers(); // Refresh list
        fetchStats(); // Refresh stats
        setTimeout(() => setMessage(''), 5000);
      } else {
        setError(result.error || 'Failed to restore cashier');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Network error occurred');
    }
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

  // Google Sheets functions
  const testGoogleSheetsConnection = async () => {
    setSheetsStatus(prev => ({ ...prev, testing: true }));
    
    try {
      const response = await fetch('/api/google-sheets', {
        method: 'GET'
      });
      
      const result = await response.json();
      setSheetsStatus(prev => ({
        ...prev,
        connected: result.connected,
        message: result.message,
        testing: false
      }));
      
      if (result.connected) {
        setMessage('Google Sheets connection successful!');
      } else {
        setError('Google Sheets connection failed. Check your credentials.');
      }
      
      setTimeout(() => {
        setMessage('');
        setError('');
      }, 3000);
    } catch (error) {
      console.error('Error testing Google Sheets connection:', error);
      setSheetsStatus(prev => ({
        ...prev,
        connected: false,
        message: 'Connection test failed',
        testing: false
      }));
      setError('Failed to test Google Sheets connection');
      setTimeout(() => setError(''), 3000);
    }
  };

  const initializeGoogleSheets = async () => {
    setSheetsStatus(prev => ({ ...prev, initializing: true }));
    
    try {
      const response = await fetch('/api/google-sheets', {
        method: 'POST'
      });
      
      const result = await response.json();
      setSheetsStatus(prev => ({
        ...prev,
        connected: result.connected,
        message: result.message,
        initializing: false
      }));
      
      if (result.success) {
        setMessage('Google Sheets initialized successfully!');
      } else {
        setError('Failed to initialize Google Sheets');
      }
      
      setTimeout(() => {
        setMessage('');
        setError('');
      }, 3000);
    } catch (error) {
      console.error('Error initializing Google Sheets:', error);
      setSheetsStatus(prev => ({
        ...prev,
        connected: false,
        message: 'Initialization failed',
        initializing: false
      }));
      setError('Failed to initialize Google Sheets');
      setTimeout(() => setError(''), 3000);
    }
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
              onClick={() => {
                setShowManageCashiers(true);
                fetchAllCashiers();
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Cashiers
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

      {/* Manage Cashiers Modal */}
      {showManageCashiers && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowManageCashiers(false)}
        >
          <div 
            className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] border border-gray-700 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Manage Cashiers</h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowManageCashiers(false);
                    setShowAddUserForm(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManageCashiers(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              {cashiersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-3 text-gray-400">Loading cashiers...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {cashiers.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No cashiers found</p>
                  ) : (
                    cashiers.map((cashier) => (
                      <div 
                        key={cashier.user_id} 
                        className={`p-4 rounded-lg border ${
                          cashier.status === 'ACTIVE' 
                            ? 'bg-gray-700 border-gray-600' 
                            : 'bg-red-900/20 border-red-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                cashier.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'
                              }`} />
                              <div>
                                <h3 className="text-white font-medium">{cashier.email}</h3>
                                <p className="text-sm text-gray-400">
                                  Role: {cashier.role} | Status: {cashier.status}
                                  {cashier.deleted_at && (
                                    <span className="ml-2">
                                      Deleted: {new Date(cashier.deleted_at).toLocaleDateString()}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {cashier.status === 'ACTIVE' ? (
                              <Button
                                onClick={() => deleteCashier(cashier.email)}
                                variant="outline"
                                size="sm"
                                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            ) : (
                              <Button
                                onClick={() => restoreCashier(cashier.email)}
                                variant="outline"
                                size="sm"
                                className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Restore
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-700">
              <Button
                onClick={fetchAllCashiers}
                variant="outline"
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 lg:p-6">{/* Success/Error Messages */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
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

          {/* Google Sheets Card */}
          <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
            <CardContent className="text-center p-8">
              <div className="mx-auto bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-white text-xl font-semibold mb-4">Google Sheets</h3>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={testGoogleSheetsConnection}
                  disabled={sheetsStatus.testing}
                  className="bg-green-600 hover:bg-green-500 text-white w-full text-sm"
                >
                  {sheetsStatus.testing ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button 
                  onClick={initializeGoogleSheets}
                  disabled={sheetsStatus.initializing}
                  className="bg-blue-600 hover:bg-blue-500 text-white w-full text-sm"
                >
                  {sheetsStatus.initializing ? 'Initializing...' : 'Initialize Sheet'}
                </Button>
              </div>
              {sheetsStatus.message && (
                <div className={`mt-2 text-xs ${sheetsStatus.connected ? 'text-green-400' : 'text-red-400'}`}>
                  {sheetsStatus.message}
                </div>
              )}
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