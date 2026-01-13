import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOutlet } from '@/hooks/useOutlet';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, ShoppingCart, Receipt, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import AIInsightsPanel from '@/components/AIInsightsPanel';

interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  todayExpenses: number;
  lowStockItems: number;
  monthSales: number;
  monthExpenses: number;
  todayBookings: number;
  monthBookingsRevenue: number;
}

export default function Dashboard() {
  const { role, profile } = useAuth();
  const { selectedOutlet } = useOutlet();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayTransactions: 0,
    todayExpenses: 0,
    lowStockItems: 0,
    monthSales: 0,
    monthExpenses: 0,
    todayBookings: 0,
    monthBookingsRevenue: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedOutlet) {
      fetchDashboardData();
    }
  }, [selectedOutlet]);

  const fetchDashboardData = async () => {
    if (!selectedOutlet) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      // Today's transactions
      const { data: todayTx } = await supabase
        .from('transactions')
        .select('total')
        .eq('outlet_id', selectedOutlet.id)
        .gte('created_at', today);

      const todaySales = todayTx?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
      const todayTransactions = todayTx?.length || 0;

      // Today's expenses
      const { data: todayExp } = await supabase
        .from('expenses')
        .select('amount')
        .eq('outlet_id', selectedOutlet.id)
        .eq('status', 'approved')
        .gte('created_at', today);

      const todayExpenses = todayExp?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Month totals
      const { data: monthTx } = await supabase
        .from('transactions')
        .select('total')
        .eq('outlet_id', selectedOutlet.id)
        .gte('created_at', monthStart);

      const monthSales = monthTx?.reduce((sum, t) => sum + Number(t.total), 0) || 0;

      const { data: monthExp } = await supabase
        .from('expenses')
        .select('amount')
        .eq('outlet_id', selectedOutlet.id)
        .eq('status', 'approved')
        .gte('created_at', monthStart);

      const monthExpenses = monthExp?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Low stock items count
      const { count: lowStockCount } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true });

      // Today's bookings
      const { data: todayBookingsData } = await supabase
        .from('bookings')
        .select('*')
        .eq('outlet_id', selectedOutlet.id)
        .gte('created_at', today);

      const todayBookings = todayBookingsData?.length || 0;

      // Month bookings revenue
      const { data: monthBookingsData } = await supabase
        .from('bookings')
        .select('payment_amount')
        .eq('outlet_id', selectedOutlet.id)
        .eq('payment_status', 'paid')
        .gte('created_at', monthStart);

      const monthBookingsRevenue = monthBookingsData?.reduce((sum, b) => sum + Number(b.payment_amount), 0) || 0;

      // Recent transactions
      const { data: recent } = await supabase
        .from('transactions')
        .select('*, profiles:user_id(full_name)')
        .eq('outlet_id', selectedOutlet.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        todaySales,
        todayTransactions,
        todayExpenses,
        lowStockItems: 0,
        monthSales,
        monthExpenses,
        todayBookings,
        monthBookingsRevenue,
      });

      setRecentTransactions(recent || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const profit = stats.monthSales - stats.monthExpenses;
  const profitMargin = stats.monthSales > 0 ? (profit / stats.monthSales) * 100 : 0;

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            Selamat Datang, {profile?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            {selectedOutlet ? `${selectedOutlet.name} - ` : ''}
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-warm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Penjualan Hari Ini</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.todaySales)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.todayTransactions} transaksi</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-warm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Booking Hari Ini</p>
                  <p className="text-2xl font-bold mt-1">{stats.todayBookings}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(stats.monthBookingsRevenue)} bulan ini
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-warm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pengeluaran Hari Ini</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.todayExpenses)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-warm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Profit Bulan Ini</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(profit)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{profitMargin.toFixed(1)}% margin</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${profit >= 0 ? 'bg-accent' : 'bg-destructive/10'}`}>
                  {profit >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-accent-foreground" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-destructive" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-warm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sales Bulan Ini</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.monthSales)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <AIInsightsPanel />

        {/* Recent Transactions */}
        <Card className="card-warm">
          <CardHeader>
            <CardTitle className="font-display">Transaksi Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Belum ada transaksi hari ini</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{tx.transaction_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        {' • '}
                        {tx.profiles?.full_name || 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(tx.total)}</p>
                      <p className="text-xs text-muted-foreground uppercase">{tx.payment_method}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
