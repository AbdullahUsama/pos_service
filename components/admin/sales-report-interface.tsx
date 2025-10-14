"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sale } from '@/lib/types/database';
import { formatCurrency, formatDate } from '@/lib/utils/auth';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SimpleThemeToggle } from '@/components/simple-theme-toggle';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, Download, Filter, ChevronDown, X, Calendar, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SalesReportInterfaceProps {
  userEmail: string;
}

export default function SalesReportInterface({ userEmail }: SalesReportInterfaceProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesFilter, setSalesFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [cashierEmails, setCashierEmails] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // New filter states
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
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
  }, [supabase]);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching sales:', error);
      } else {
        setSales(data || []);
        
        // Fetch cashier emails including deleted users
        const uniqueCashierIds = [...new Set((data || []).map(sale => sale.cashier_id))];
        
        if (uniqueCashierIds.length > 0) {
          try {
            const emailsMap: Record<string, string> = {};
            
            // Use the get_cashier_display_name function for each cashier
            for (const cashierId of uniqueCashierIds) {
              const { data: displayName, error } = await supabase.rpc('get_cashier_display_name', {
                cashier_id: cashierId
              });
              
              if (!error && displayName) {
                emailsMap[cashierId] = displayName;
              } else {
                emailsMap[cashierId] = '[UNKNOWN USER]';
              }
            }
            
            setCashierEmails(emailsMap);
          } catch (error) {
            console.error('Error fetching cashier display names:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchSales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToAdmin = () => {
    router.push('/admin');
  };

  const handleViewAnalytics = () => {
    router.push('/admin/analytics');
  };

  // Get unique cashiers for dropdown
  const getUniqueCashiers = () => {
    const uniqueCashiers = [...new Set(sales.map(sale => sale.cashier_id))];
    return uniqueCashiers.map(cashierId => ({
      id: cashierId,
      email: cashierEmails[cashierId] || 'Unknown'
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setSalesFilter('');
    setSelectedCashier('all');
    setDateFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const getFilteredSales = () => {
    let filtered = sales;

    // Apply text filter (general search)
    if (salesFilter) {
      filtered = filtered.filter(sale => {
        const cashierEmail = cashierEmails[sale.cashier_id] || '';
        return sale.cashier_id.includes(salesFilter) ||
               cashierEmail.toLowerCase().includes(salesFilter.toLowerCase()) ||
               sale.payment_method.toLowerCase().includes(salesFilter.toLowerCase());
      });
    }

    // Apply cashier filter
    if (selectedCashier !== 'all') {
      filtered = filtered.filter(sale => sale.cashier_id === selectedCashier);
    }

    // Apply date range filter (takes priority over time period filter)
    if (startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= start && saleDate <= end;
      });
    } else if (dateFilter !== 'all') {
      // Apply time period filter only if no date range is set
      const now = new Date();
      let startDate: Date;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          return filtered;
      }

      filtered = filtered.filter(sale => new Date(sale.created_at) >= startDate);
    }

    return filtered;
  };

  const getSalesStats = () => {
    const filteredSales = getFilteredSales();
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const totalTransactions = filteredSales.length;
    
    // Calculate today's sales using client-side filtering
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    
    const todaySales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= todayStart && saleDate <= todayEnd;
    });
    
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total_amount, 0);

    return {
      totalRevenue,
      totalTransactions,
      todayRevenue,
      averageTransaction: totalTransactions > 0 ? totalRevenue / totalTransactions : 0
    };
  };

  const filteredSales = getFilteredSales();
  const stats = getSalesStats();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border px-3 sm:px-4 lg:px-6 py-3 lg:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBackToAdmin}
              className="flex items-center justify-center gap-2 bg-secondary text-foreground border-border hover:bg-secondary/80 w-full sm:w-auto text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div className="text-center sm:text-left">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">Sales Reports</h1>
              <p className="text-xs text-muted-foreground">Logged in as: {userEmail}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleViewAnalytics}
              className="bg-slate-600 border-slate-500 text-white hover:bg-slate-500 px-4 py-2 text-sm"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">View Analytics</span>
              <span className="sm:hidden">Analytics</span>
            </Button>
            <SimpleThemeToggle />
          </div>
        </div>
      </header>

      <div className="p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-3 sm:p-4">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-sm sm:text-lg lg:text-xl font-bold text-green-600 dark:text-green-400 truncate">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-3 sm:p-4">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Transactions</p>
                <p className="text-sm sm:text-lg lg:text-xl font-bold text-blue-600 dark:text-blue-400">{stats.totalTransactions}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-3 sm:p-4">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Today's Sales</p>
                <p className="text-sm sm:text-lg lg:text-xl font-bold text-indigo-600 dark:text-indigo-400 truncate">
                  {formatCurrency(stats.todayRevenue)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-3 sm:p-4">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Avg. Transaction</p>
                <p className="text-sm sm:text-lg lg:text-xl font-bold text-orange-600 dark:text-orange-400 truncate">
                  {formatCurrency(stats.averageTransaction)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-foreground" />
                <CardTitle className="text-foreground text-lg">Filters</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {(salesFilter || selectedCashier !== 'all' || dateFilter !== 'all' || startDate || endDate) && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
                <ChevronDown 
                  className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                    showFilters ? 'rotate-180' : ''
                  }`} 
                />
              </div>
            </button>
          </CardHeader>
          
          {showFilters && (
            <CardContent className="border-t border-gray-700 pt-4">
              <div className="space-y-4">
                {/* First row - Search and Cashier Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">General Search</label>
                    <Input
                      placeholder="Search by payment method, etc..."
                      value={salesFilter}
                      onChange={(e) => setSalesFilter(e.target.value)}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Cashier Name</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full bg-background border-border text-foreground hover:bg-accent justify-between"
                        >
                          <span className="truncate">
                            {selectedCashier === 'all' 
                              ? 'All Cashiers' 
                              : cashierEmails[selectedCashier] || 'Unknown'
                            }
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full bg-card border-border">
                        <DropdownMenuItem 
                          onClick={() => setSelectedCashier('all')}
                          className="text-foreground hover:bg-accent cursor-pointer"
                        >
                          All Cashiers
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border" />
                        {getUniqueCashiers().map((cashier) => (
                          <DropdownMenuItem 
                            key={cashier.id}
                            onClick={() => setSelectedCashier(cashier.id)}
                            className="text-foreground hover:bg-accent cursor-pointer"
                          >
                            {cashier.email}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Second row - Time Period and Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Time Period</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full bg-background border border-border text-foreground rounded-md px-3 py-2 focus:border-blue-400 focus:ring-blue-400 focus:outline-none"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">Past Week</option>
                      <option value="month">This Month</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-background border-border text-foreground focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-background border-border text-foreground focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                </div>

                {/* Third row - Action buttons */}
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white font-medium"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Sales Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-lg sm:text-xl flex items-center justify-between">
              <span>Sales Transactions</span>
              <span className="text-sm font-normal text-muted-foreground">({filteredSales.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p>Loading sales data...</p>
              </div>
            ) : (
              <div>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-muted-foreground font-medium">Date/Time</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Cashier</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Amount</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Payment</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.map((sale) => (
                        <tr key={sale.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                          <td className="p-3 text-foreground text-sm">{formatDate(sale.created_at)}</td>
                          <td className="p-3 text-muted-foreground text-sm">
                            {cashierEmails[sale.cashier_id] || 'Loading...'}
                          </td>
                          <td className="p-3 font-semibold text-green-600 dark:text-green-400">{formatCurrency(sale.total_amount)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              sale.payment_method === 'Cash' 
                                ? 'bg-green-800 text-green-200' 
                                : 'bg-blue-800 text-blue-200'
                            }`}>
                              {sale.payment_method}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="text-xs text-foreground space-y-1">
                              {sale.cart_details.map((item, index) => (
                                <div key={index} className="truncate">
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

                {/* Mobile/Tablet Cards */}
                <div className="lg:hidden space-y-4">
                  {filteredSales.map((sale) => (
                    <div key={sale.id} className="bg-gray-700 rounded-lg border border-gray-600 overflow-hidden">
                      <div className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="text-sm text-gray-300 mb-1">{formatDate(sale.created_at)}</div>
                            <div className="text-lg font-semibold text-green-400">{formatCurrency(sale.total_amount)}</div>
                          </div>
                          <div className="flex flex-col sm:items-end gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium w-fit ${
                              sale.payment_method === 'Cash' 
                                ? 'bg-green-800 text-green-200' 
                                : 'bg-blue-800 text-blue-200'
                            }`}>
                              {sale.payment_method}
                            </span>
                          </div>
                        </div>
                        
                        <div className="border-t border-gray-600 pt-3">
                          <div className="text-sm text-white mb-2">
                            <span className="text-gray-400">Cashier:</span> {cashierEmails[sale.cashier_id] || 'Loading...'}
                          </div>
                          
                          <div>
                            <div className="text-sm font-medium text-gray-300 mb-2">Items purchased:</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                              {sale.cart_details.map((item, index) => (
                                <div key={index} className="text-sm text-gray-400 bg-gray-600 px-2 py-1 rounded">
                                  {item.name} <span className="font-medium text-white">x{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredSales.length === 0 && !isLoading && (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-lg mb-2">No sales found</p>
                    <p className="text-sm">Try adjusting your filters or check back later</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}