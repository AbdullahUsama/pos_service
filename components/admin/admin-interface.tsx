"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Package, BarChart3, Users, DollarSign } from 'lucide-react';
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
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
  }, []);

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

  const navigateToInventory = () => {
    router.push('/admin/inventory');
  };

  const navigateToSalesReport = () => {
    router.push('/admin/sales');
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

      <div className="p-3 lg:p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Items</p>
                  <p className="text-2xl font-bold text-white">{stats.totalItems}</p>
                </div>
                <Package className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Sales</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalSales)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Today's Sales</p>
                  <p className="text-2xl font-bold text-yellow-400">{formatCurrency(stats.todaySales)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Cashiers</p>
                  <p className="text-2xl font-bold text-purple-400">{stats.totalCashiers}</p>
                </div>
                <Users className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Inventory Management Card */}
          <Card 
            className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
            onClick={navigateToInventory}
          >
            <CardHeader className="text-center">
              <div className="mx-auto bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-white text-xl lg:text-2xl">Inventory Management</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-300 mb-4">
                Manage your shop inventory - add, edit, and delete items. View current stock and pricing.
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Current items in inventory: <span className="text-blue-400 font-semibold">{stats.totalItems}</span>
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Manage Inventory
              </Button>
            </CardContent>
          </Card>

          {/* Sales Report Card */}
          <Card 
            className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
            onClick={navigateToSalesReport}
          >
            <CardHeader className="text-center">
              <div className="mx-auto bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-white text-xl lg:text-2xl">Sales Reports</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-300 mb-4">
                View detailed sales reports, transaction history, and cashier performance analytics.
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Today's revenue: <span className="text-green-400 font-semibold">{formatCurrency(stats.todaySales)}</span>
              </p>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                View Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}