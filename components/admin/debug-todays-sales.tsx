// Debug component to compare admin panel vs sales report logic
// Add this temporarily to your admin panel to debug the calculations

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function DebugTodaysSales() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const supabase = createClient();

  const runDebugComparison = async () => {
    try {
      // Fetch all sales data
      const { data: allSales } = await supabase
        .from('sales')
        .select('total_amount, created_at')
        .order('created_at', { ascending: false });

      if (!allSales) return;

      const today = new Date();
      console.log('Current time:', today.toLocaleString());
      console.log('Current time UTC:', today.toISOString());

      // Admin panel logic (client-side filtering)
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const adminTodaysSales = allSales.filter(sale => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= startOfDay;
      });
      const adminTotal = adminTodaysSales.reduce((sum, sale) => sum + sale.total_amount, 0);

      // Sales report logic (same as above - they should be identical now)
      const reportTodaysSales = allSales.filter(sale => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= startOfDay;
      });
      const reportTotal = reportTodaysSales.reduce((sum, sale) => sum + sale.total_amount, 0);

      // Server-side filtering attempt (old method)
      const startOfDayISO = startOfDay.toISOString();
      const endOfDayISO = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      
      const { data: serverFiltered } = await supabase
        .from('sales')
        .select('total_amount, created_at')
        .gte('created_at', startOfDayISO)
        .lt('created_at', endOfDayISO);

      const serverTotal = serverFiltered?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;

      const debug = {
        currentTime: today.toLocaleString(),
        currentTimeUTC: today.toISOString(),
        startOfDay: startOfDay.toISOString(),
        endOfDay: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString(),
        totalSalesCount: allSales.length,
        adminMethod: {
          count: adminTodaysSales.length,
          total: adminTotal,
          sales: adminTodaysSales.map(s => ({
            amount: s.total_amount,
            time: new Date(s.created_at).toLocaleString(),
            timeUTC: s.created_at
          }))
        },
        reportMethod: {
          count: reportTodaysSales.length,
          total: reportTotal
        },
        serverMethod: {
          count: serverFiltered?.length || 0,
          total: serverTotal,
          sales: serverFiltered?.map(s => ({
            amount: s.total_amount,
            time: new Date(s.created_at).toLocaleString(),
            timeUTC: s.created_at
          })) || []
        },
        match: adminTotal === reportTotal && adminTotal === serverTotal
      };

      console.log('Debug comparison:', debug);
      setDebugInfo(debug);

    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  return (
    <div className="p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
      <h3 className="text-yellow-400 font-semibold mb-2">Debug Today's Sales</h3>
      <Button onClick={runDebugComparison} className="bg-yellow-600 hover:bg-yellow-500">
        Run Comparison
      </Button>
      
      {debugInfo && (
        <div className="mt-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-white font-medium">Admin Panel Method</h4>
              <p>Count: {debugInfo.adminMethod.count}</p>
              <p>Total: ${debugInfo.adminMethod.total}</p>
            </div>
            <div>
              <h4 className="text-white font-medium">Sales Report Method</h4>
              <p>Count: {debugInfo.reportMethod.count}</p>
              <p>Total: ${debugInfo.reportMethod.total}</p>
            </div>
            <div>
              <h4 className="text-white font-medium">Server Filter Method</h4>
              <p>Count: {debugInfo.serverMethod.count}</p>
              <p>Total: ${debugInfo.serverMethod.total}</p>
            </div>
          </div>
          
          <div className="mt-4">
            <p className={`font-semibold ${debugInfo.match ? 'text-green-400' : 'text-red-400'}`}>
              Methods match: {debugInfo.match ? 'YES' : 'NO'}
            </p>
          </div>
          
          <details className="mt-4">
            <summary className="cursor-pointer text-blue-400">Show detailed debug info</summary>
            <pre className="text-xs bg-gray-800 p-2 rounded mt-2 overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}