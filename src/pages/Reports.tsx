import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useOutlet } from '@/hooks/useOutlet';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Receipt, FileDown, Loader2, Building2 } from 'lucide-react';
import { generateReportPDF, ReportData } from '@/lib/pdfGenerator';
import { useToast } from '@/hooks/use-toast';

interface Outlet {
  id: string;
  name: string;
  address?: string;
}

export default function Reports() {
  const { selectedOutlet, outlets: contextOutlets } = useOutlet();
  const { toast } = useToast();
  const [period, setPeriod] = useState('month');
  const [generating, setGenerating] = useState(false);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [reportOutletId, setReportOutletId] = useState<string>('all');
  const [stats, setStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    totalExpenses: 0,
    grossProfit: 0,
    netProfit: 0,
    avgTransaction: 0,
    topProducts: [] as { name: string; quantity: number; revenue: number }[],
    salesByPayment: [] as { method: string; total: number; count: number }[],
    dailyData: [] as { date: string; sales: number; transactions: number }[],
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Fetch all outlets for dropdown
  useEffect(() => {
    const fetchOutlets = async () => {
      const { data } = await supabase
        .from('outlets')
        .select('id, name, address')
        .eq('is_active', true)
        .order('name');
      setOutlets(data || []);
      // Default to selected outlet or 'all'
      if (selectedOutlet) {
        setReportOutletId(selectedOutlet.id);
      }
    };
    fetchOutlets();
  }, [selectedOutlet]);

  useEffect(() => {
    fetchReportData();
  }, [reportOutletId, period]);

  const getSelectedOutletName = () => {
    if (reportOutletId === 'all') return 'Semua Outlet';
    const outlet = outlets.find(o => o.id === reportOutletId);
    return outlet?.name || 'Outlet';
  };

  const fetchReportData = async () => {
    if (!reportOutletId) return;

    try {
      const today = new Date();
      let startDate: Date;

      switch (period) {
        case 'week':
          startDate = new Date(today);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(today.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      }

      setDateRange({
        start: startDate.toLocaleDateString('id-ID'),
        end: today.toLocaleDateString('id-ID')
      });

      // Fetch transactions with items - filter by outlet if specific outlet selected
      let transactionsQuery = supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .gte('created_at', startDate.toISOString());
      
      if (reportOutletId !== 'all') {
        transactionsQuery = transactionsQuery.eq('outlet_id', reportOutletId);
      }
      
      const { data: transactions } = await transactionsQuery;

      // Fetch expenses - filter by outlet if specific outlet selected
      let expensesQuery = supabase
        .from('expenses')
        .select('*')
        .eq('status', 'approved')
        .gte('created_at', startDate.toISOString());
      
      if (reportOutletId !== 'all') {
        expensesQuery = expensesQuery.eq('outlet_id', reportOutletId);
      }
      
      const { data: expenses } = await expensesQuery;

      const totalSales = transactions?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
      const totalTransactions = transactions?.length || 0;
      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Calculate cost of goods sold (COGS)
      let cogs = 0;
      transactions?.forEach((tx) => {
        tx.transaction_items?.forEach((item: any) => {
          cogs += Number(item.cost_price) * item.quantity;
        });
      });

      const grossProfit = totalSales - cogs;
      const netProfit = grossProfit - totalExpenses;
      const avgTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

      // Top products
      const productMap = new Map<string, { quantity: number; revenue: number }>();
      transactions?.forEach((tx) => {
        tx.transaction_items?.forEach((item: any) => {
          const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 };
          productMap.set(item.product_name, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + Number(item.subtotal),
          });
        });
      });

      const topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Sales by payment method
      const paymentMap = new Map<string, { total: number; count: number }>();
      transactions?.forEach((tx) => {
        const existing = paymentMap.get(tx.payment_method) || { total: 0, count: 0 };
        paymentMap.set(tx.payment_method, {
          total: existing.total + Number(tx.total),
          count: existing.count + 1,
        });
      });

      const salesByPayment = Array.from(paymentMap.entries())
        .map(([method, data]) => ({ method, ...data }));

      // Daily data for chart
      const dailyMap = new Map<string, { sales: number; transactions: number }>();
      transactions?.forEach((tx) => {
        const date = tx.created_at.split('T')[0];
        const existing = dailyMap.get(date) || { sales: 0, transactions: 0 };
        dailyMap.set(date, {
          sales: existing.sales + Number(tx.total),
          transactions: existing.transactions + 1,
        });
      });

      const dailyData = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setStats({
        totalSales,
        totalTransactions,
        totalExpenses,
        grossProfit,
        netProfit,
        avgTransaction,
        topProducts,
        salesByPayment,
        dailyData,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportOutletId) return;

    setGenerating(true);
    try {
      const profitMargin = stats.totalSales > 0 ? (stats.netProfit / stats.totalSales) * 100 : 0;

      const reportData: ReportData = {
        outletName: getSelectedOutletName(),
        periodLabel: period === 'week' ? '7 Hari Terakhir' : period === 'month' ? 'Bulan Ini' : 'Tahun Ini',
        startDate: dateRange.start,
        endDate: dateRange.end,
        totalSales: stats.totalSales,
        totalTransactions: stats.totalTransactions,
        totalExpenses: stats.totalExpenses,
        grossProfit: stats.grossProfit,
        netProfit: stats.netProfit,
        avgTransaction: stats.avgTransaction,
        profitMargin,
        topProducts: stats.topProducts,
        salesByPayment: stats.salesByPayment,
        dailyData: stats.dailyData,
      };

      await generateReportPDF(reportData);
      toast({ title: 'Berhasil', description: 'Laporan PDF berhasil diunduh' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Error', description: 'Gagal membuat PDF', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const profitMargin = stats.totalSales > 0 ? (stats.netProfit / stats.totalSales) * 100 : 0;

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Laporan Keuangan</h1>
            <p className="text-muted-foreground">{getSelectedOutletName()}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Outlet Selector */}
            <Select value={reportOutletId} onValueChange={setReportOutletId}>
              <SelectTrigger className="w-48">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Pilih Outlet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Outlet</SelectItem>
                {outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Period Selector */}
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">7 Hari</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
                <SelectItem value="year">Tahun Ini</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={handleDownloadPDF} disabled={generating || loading}>
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              {generating ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-warm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Penjualan</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalSales)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.totalTransactions} transaksi</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-warm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalExpenses)}</p>
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
                  <p className="text-sm text-muted-foreground">Gross Profit</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.grossProfit)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`card-warm ${stats.netProfit >= 0 ? 'border-accent' : 'border-destructive'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.netProfit)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{profitMargin.toFixed(1)}% margin</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stats.netProfit >= 0 ? 'bg-accent' : 'bg-destructive/10'}`}>
                  {stats.netProfit >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-accent-foreground" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-destructive" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card className="card-warm">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Produk Terlaris
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Belum ada data</p>
              ) : (
                <div className="space-y-4">
                  {stats.topProducts.map((product, index) => (
                    <div key={product.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.quantity} terjual</p>
                        </div>
                      </div>
                      <p className="font-semibold">{formatCurrency(product.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales by Payment Method */}
          <Card className="card-warm">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Package className="h-5 w-5" />
                Penjualan per Metode Bayar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.salesByPayment.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Belum ada data</p>
              ) : (
                <div className="space-y-4">
                  {stats.salesByPayment.map((item) => (
                    <div key={item.method} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium uppercase">{item.method}</p>
                        <p className="text-sm text-muted-foreground">{item.count} transaksi</p>
                      </div>
                      <p className="font-semibold">{formatCurrency(item.total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
