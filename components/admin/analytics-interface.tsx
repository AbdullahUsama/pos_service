"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sale, Item } from '@/lib/types/database';
import { formatCurrency } from '@/lib/utils/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SimpleThemeToggle } from '@/components/simple-theme-toggle';
import { ArrowLeft, BarChart3, TrendingUp, DollarSign, Package, CreditCard, Users, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface AnalyticsInterfaceProps {
  userEmail: string;
}

// Hook to get theme colors
const useThemeColors = () => {
  const [colors, setColors] = useState({
    foreground: '#000000',
    mutedForeground: '#6b7280',
    popover: '#ffffff',
    popoverForeground: '#000000',
    border: '#e5e7eb',
  });

  useEffect(() => {
    const updateColors = () => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      setColors({
        foreground: `hsl(${computedStyle.getPropertyValue('--foreground')})`,
        mutedForeground: `hsl(${computedStyle.getPropertyValue('--muted-foreground')})`,
        popover: `hsl(${computedStyle.getPropertyValue('--popover')})`,
        popoverForeground: `hsl(${computedStyle.getPropertyValue('--popover-foreground')})`,
        border: `hsl(${computedStyle.getPropertyValue('--border')})`,
      });
    };

    // Update colors on mount
    updateColors();

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          updateColors();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
};

export default function AnalyticsInterface({ userEmail }: AnalyticsInterfaceProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [cashierEmails, setCashierEmails] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('month'); // Default to current month
  const [chartKey, setChartKey] = useState(0); // Force chart re-render
  const router = useRouter();
  const supabase = createClient();
  const themeColors = useThemeColors();

  useEffect(() => {
    fetchData();
    
    // Subscribe to real-time sales updates
    const salesSubscription = supabase
      .channel('sales_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'sales' },
        (payload) => {
          console.log('🔔 New sale detected:', payload);
          fetchData(); // Refresh data when new sale is inserted
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'sales' },
        (payload) => {
          console.log('🔔 Sale updated:', payload);
          fetchData(); // Refresh data when sale is updated
        }
      )
      .subscribe();

    return () => {
      salesSubscription.unsubscribe();
    };
  }, [dateFilter]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchSales(), fetchItems()]);
      // Force chart re-render by updating key
      setChartKey(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sales:', error);
        return;
      }

      console.log('🔍 Fetched sales data:', {
        totalSales: data?.length || 0,
        sampleSales: data?.slice(0, 3),
        todaysSales: data?.filter(sale => {
          const saleDate = new Date(sale.created_at);
          const today = new Date();
          return saleDate.getDate() === today.getDate() &&
                 saleDate.getMonth() === today.getMonth() &&
                 saleDate.getFullYear() === today.getFullYear();
        })
      });

      setSales(data || []);

      // Fetch cashier emails for active users only (exclude deleted users)
      if (data && data.length > 0) {
        const uniqueCashierIds = [...new Set(data.map(sale => sale.cashier_id))];
        
        try {
          const emailsMap: Record<string, string> = {};
          
          // Use the get_cashier_display_name function for each cashier
          for (const cashierId of uniqueCashierIds) {
            const { data: displayName, error } = await supabase.rpc('get_cashier_display_name', {
              cashier_id: cashierId
            });
            
            if (!error && displayName) {
              // Only include active users (exclude deleted ones)
              if (!displayName.includes('[DELETED]')) {
                emailsMap[cashierId] = displayName;
              }
            }
          }
          
          setCashierEmails(emailsMap);
          console.log('📧 Fetched active cashier display names:', emailsMap);
        } catch (emailError) {
          console.error('Error fetching cashier display names:', emailError);
        }
      }
    } catch (error) {
      console.error('Error in fetchSales:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching items:', error);
      } else {
        setItems(data || []);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const getFilteredSales = () => {
    if (dateFilter === 'all') return sales;

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (dateFilter) {
      case 'today':
        // Set start to beginning of today (00:00:00)
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        // Set end to end of today (23:59:59.999)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      default:
        return sales;
    }

    return sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= startDate && saleDate <= endDate;
    });
  };

  const handleBackToSales = () => {
    router.push('/admin/sales');
  };

  // Chart data generators
  const getCashierSalesData = () => {
    const filteredSales = getFilteredSales();
    const cashierSales: Record<string, number> = {};

    filteredSales.forEach(sale => {
      const cashierEmail = cashierEmails[sale.cashier_id];
      
      // Only include sales from active cashiers (skip deleted ones)
      if (cashierEmail && !cashierEmail.includes('[DELETED]')) {
        cashierSales[cashierEmail] = (cashierSales[cashierEmail] || 0) + sale.total_amount;
      }
    });

    const labels = Object.keys(cashierSales);
    const data = Object.values(cashierSales);

    return {
      labels,
      datasets: [
        {
          label: 'Sales Amount',
          data,
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)',
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(139, 92, 246, 1)',
            'rgba(236, 72, 153, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const getProductQuantityData = () => {
    const filteredSales = getFilteredSales();
    const productQuantities: Record<string, number> = {};

    filteredSales.forEach(sale => {
      sale.cart_details.forEach(item => {
        productQuantities[item.name] = (productQuantities[item.name] || 0) + item.quantity;
      });
    });

    // Sort by quantity and take top 10
    const sortedProducts = Object.entries(productQuantities)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const labels = sortedProducts.map(([name]) => name);
    const data = sortedProducts.map(([, quantity]) => quantity);

    return {
      labels,
      datasets: [
        {
          label: 'Quantity Sold',
          data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(199, 199, 199, 0.8)',
            'rgba(83, 102, 255, 0.8)',
            'rgba(255, 99, 255, 0.8)',
            'rgba(99, 255, 132, 0.8)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 205, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(199, 199, 199, 1)',
            'rgba(83, 102, 255, 1)',
            'rgba(255, 99, 255, 1)',
            'rgba(99, 255, 132, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };
  };

  const getSalesTrendData = () => {
    const filteredSales = getFilteredSales();
    const dailySales: Record<string, number> = {};

    console.log('Processing sales for trend chart:', {
      totalSales: filteredSales.length,
      dateFilter,
      firstSale: filteredSales[0]?.created_at,
      lastSale: filteredSales[filteredSales.length - 1]?.created_at
    });

    filteredSales.forEach(sale => {
      // Create a proper date object and format it consistently
      const saleDate = new Date(sale.created_at);
      
      // Get the date in YYYY-MM-DD format to ensure consistent day boundaries
      const year = saleDate.getFullYear();
      const month = String(saleDate.getMonth() + 1).padStart(2, '0');
      const day = String(saleDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      
      dailySales[dateKey] = (dailySales[dateKey] || 0) + sale.total_amount;
      
      // Debug logging for today's sales
      if (dateKey === '2025-10-13') {
        console.log('Found October 13 sale:', {
          saleId: sale.id,
          amount: sale.total_amount,
          timestamp: sale.created_at,
          parsedDate: saleDate.toString()
        });
      }
    });

    console.log('Daily sales aggregated:', dailySales);

    // Sort dates properly and convert to display format
    const sortedDateKeys = Object.keys(dailySales).sort();
    
    // Convert back to display format for labels
    const labels = sortedDateKeys.map(dateKey => {
      const [year, month, day] = dateKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    });

    const data = sortedDateKeys.map(dateKey => dailySales[dateKey]);

    console.log('Final chart data:', { labels, data });

    return {
      labels,
      datasets: [
        {
          label: 'Daily Sales',
          data,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    };
  };

  const getPaymentMethodData = () => {
    const filteredSales = getFilteredSales();
    const paymentMethods: Record<string, number> = {};

    filteredSales.forEach(sale => {
      paymentMethods[sale.payment_method] = (paymentMethods[sale.payment_method] || 0) + 1;
    });

    return {
      labels: Object.keys(paymentMethods),
      datasets: [
        {
          label: 'Transactions',
          data: Object.values(paymentMethods),
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(168, 85, 247, 0.8)',
            'rgba(249, 115, 22, 0.8)',
          ],
          borderColor: [
            'rgba(34, 197, 94, 1)',
            'rgba(168, 85, 247, 1)',
            'rgba(249, 115, 22, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const getTopRevenueItemsData = () => {
    const filteredSales = getFilteredSales();
    const itemRevenues: Record<string, number> = {};

    filteredSales.forEach(sale => {
      sale.cart_details.forEach(item => {
        const revenue = item.price * item.quantity;
        itemRevenues[item.name] = (itemRevenues[item.name] || 0) + revenue;
      });
    });

    // Sort by revenue and take top 8
    const sortedItems = Object.entries(itemRevenues)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8);

    const labels = sortedItems.map(([name]) => name);
    const data = sortedItems.map(([, revenue]) => revenue);

    return {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data,
          backgroundColor: [
            'rgba(99, 102, 241, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(251, 191, 36, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(6, 182, 212, 0.8)',
            'rgba(245, 101, 101, 0.8)',
          ],
          borderWidth: 0,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: themeColors.foreground,
          font: {
            size: 12,
          },
        },
        position: 'top' as const,
      },
      tooltip: {
        backgroundColor: themeColors.popover,
        titleColor: themeColors.popoverForeground,
        bodyColor: themeColors.popoverForeground,
        borderColor: themeColors.border,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: {
          color: themeColors.mutedForeground,
          font: {
            size: 10,
          },
          maxRotation: 45,
        },
        grid: {
          color: themeColors.border,
        },
      },
      y: {
        ticks: {
          color: themeColors.mutedForeground,
          font: {
            size: 10,
          },
          callback: function(value: any) {
            if (typeof value === 'number') {
              return formatCurrency(value);
            }
            return value;
          },
        },
        grid: {
          color: themeColors.border,
        },
      },
    },
  };

  const paymentMethodsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: themeColors.foreground,
          font: {
            size: 12,
          },
        },
        position: 'top' as const,
      },
      tooltip: {
        backgroundColor: themeColors.popover,
        titleColor: themeColors.popoverForeground,
        bodyColor: themeColors.popoverForeground,
        borderColor: themeColors.border,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: {
          color: themeColors.mutedForeground,
          font: {
            size: 10,
          },
          maxRotation: 45,
        },
        grid: {
          color: themeColors.border,
        },
      },
      y: {
        ticks: {
          color: themeColors.mutedForeground,
          font: {
            size: 10,
          },
          // No callback here - just show plain numbers
        },
        grid: {
          color: themeColors.border,
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: themeColors.foreground,
          padding: 10,
          usePointStyle: true,
          font: {
            size: 10,
          },
        },
      },
      tooltip: {
        backgroundColor: themeColors.popover,
        titleColor: themeColors.popoverForeground,
        bodyColor: themeColors.popoverForeground,
        borderColor: themeColors.border,
        borderWidth: 1,
      },
    },
  };

  const getKPIData = () => {
    const filteredSales = getFilteredSales();
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const totalTransactions = filteredSales.length;
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    // Count only active cashiers (exclude deleted ones)
    const activeCashierIds = [...new Set(filteredSales.map(sale => sale.cashier_id))]
      .filter(cashierId => {
        const cashierEmail = cashierEmails[cashierId];
        return cashierEmail && !cashierEmail.includes('[DELETED]');
      });
    
    return {
      totalRevenue,
      totalTransactions,
      avgTransaction,
      uniqueCashiers: activeCashierIds.length,
    };
  };

  const kpiData = getKPIData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm lg:text-base">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={handleBackToSales}
              className="bg-card border-border text-foreground hover:bg-accent w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sales Report
            </Button>
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Sales Analytics</h1>
              <p className="text-sm text-muted-foreground">Logged in as: {userEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SimpleThemeToggle />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              fetchData();
            }}
            className="bg-card border-border text-foreground hover:bg-accent w-full sm:w-auto"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-card border border-border text-foreground rounded-md px-3 py-2 focus:border-blue-400 focus:ring-blue-400 focus:outline-none text-sm"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <Card className="bg-card border-border">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs lg:text-sm">Total Revenue</p>
                <p className="text-lg lg:text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(kpiData.totalRevenue)}</p>
              </div>
              <DollarSign className="h-6 w-6 lg:h-8 lg:w-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs lg:text-sm">Transactions</p>
                <p className="text-lg lg:text-2xl font-bold text-blue-600 dark:text-blue-400">{kpiData.totalTransactions}</p>
              </div>
              <CreditCard className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs lg:text-sm">Avg Transaction</p>
                <p className="text-lg lg:text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(kpiData.avgTransaction)}</p>
              </div>
              <TrendingUp className="h-6 w-6 lg:h-8 lg:w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs lg:text-sm">Active Cashiers</p>
                <p className="text-lg lg:text-2xl font-bold text-purple-600 dark:text-purple-400">{kpiData.uniqueCashiers}</p>
              </div>
              <Users className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="space-y-4 lg:space-y-6">
        {/* First Row - Cashier Sales & Product Quantities */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground flex items-center gap-2 text-base lg:text-lg">
                <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5" />
                Sales by Cashier
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-64 lg:h-80">
                <Bar 
                  key={`cashier-sales-${chartKey}`}
                  data={getCashierSalesData()} 
                  options={chartOptions} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground flex items-center gap-2 text-base lg:text-lg">
                <Package className="h-4 w-4 lg:h-5 lg:w-5" />
                Products by Quantity (Top 10)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-64 lg:h-80">
                <Pie 
                  key={`product-quantity-${chartKey}`}
                  data={getProductQuantityData()} 
                  options={pieOptions} 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second Row - Sales Trend & Payment Methods */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground flex items-center gap-2 text-base lg:text-lg">
                <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" />
                Sales Trend Over Time
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-64 lg:h-80">
                <Line 
                  key={`sales-trend-${chartKey}`}
                  data={getSalesTrendData()} 
                  options={chartOptions} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground flex items-center gap-2 text-base lg:text-lg">
                <CreditCard className="h-4 w-4 lg:h-5 lg:w-5" />
                Payment Methods Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-64 lg:h-80">
                <Bar 
                  key={`payment-methods-${chartKey}`}
                  data={getPaymentMethodData()} 
                  options={paymentMethodsOptions} 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Third Row - Top Revenue Items */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground flex items-center gap-2 text-base lg:text-lg">
                <DollarSign className="h-4 w-4 lg:h-5 lg:w-5" />
                Top Revenue Items
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-64 lg:h-80">
                <Doughnut 
                  key={`revenue-items-${chartKey}`}
                  data={getTopRevenueItemsData()} 
                  options={pieOptions} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground flex items-center gap-2 text-base lg:text-lg">
                <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5" />
                Additional Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-64 lg:h-80 flex flex-col justify-center space-y-3 lg:space-y-4 text-muted-foreground">
                <div className="text-center">
                  <h3 className="text-base lg:text-lg font-semibold mb-3 lg:mb-4">Quick Statistics</h3>
                  <div className="space-y-2 lg:space-y-3 text-sm lg:text-base">
                    <div className="flex justify-between">
                      <span>Total Items Sold:</span>
                      <span className="font-bold">
                        {getFilteredSales().reduce((sum, sale) => 
                          sum + sale.cart_details.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unique Products:</span>
                      <span className="font-bold">
                        {new Set(getFilteredSales().flatMap(sale => sale.cart_details.map(item => item.name))).size}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Best Sales Day:</span>
                      <span className="font-bold text-xs lg:text-sm">
                        {(() => {
                          const dailySales: Record<string, number> = {};
                          getFilteredSales().forEach(sale => {
                            const date = new Date(sale.created_at).toLocaleDateString('en-US');
                            dailySales[date] = (dailySales[date] || 0) + sale.total_amount;
                          });
                          const bestDay = Object.entries(dailySales).reduce((a, b) => a[1] > b[1] ? a : b, ['N/A', 0]);
                          return bestDay[0];
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}