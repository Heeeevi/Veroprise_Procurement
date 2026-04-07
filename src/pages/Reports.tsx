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
import { Calendar as CalendarIcon, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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
    cogs: 0, // Cost of Goods Sold (HPP)
    grossProfit: 0,
    netProfit: 0,
    avgTransaction: 0,
    topProducts: [] as { name: string; quantity: number; revenue: number }[],
    salesByPayment: [] as { method: string; total: number; count: number }[],
    dailyData: [] as { date: string; sales: number; transactions: number }[],
    cashToDeposit: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Daily Closing State
  const [showClosingDialog, setShowClosingDialog] = useState(false);
  const [closingDate, setClosingDate] = useState(new Date().toISOString().split('T')[0]);
  const [closingData, setClosingData] = useState<any>(null);
  const [actualCash, setActualCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [closingStats, setClosingStats] = useState({
    totalSales: 0,
    cashSales: 0,
    nonCashSales: 0,
    expenses: 0,
    cashToDeposit: 0,
  });

  // Fetch all outlets for dropdown
  useEffect(() => {
    const fetchOutlets = async () => {
      const { data } = await supabase
        .from('outlets')
        .select('id, name, address')
        .eq('status', 'active')
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

      // Fetch transactions with items
      let transactionsQuery = supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .gte('created_at', startDate.toISOString());

      if (reportOutletId !== 'all') {
        transactionsQuery = transactionsQuery.eq('outlet_id', reportOutletId);
      }

      const { data: transactions } = await transactionsQuery;

      // Fetch expenses
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
          cogs += Number(item.cost_price || 0) * item.quantity;
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
        .filter(([name]) => name !== undefined && name !== null && name !== 'undefined' && name !== 'null')
        .map(([name, data]) => ({ name: name || 'Unnamed', ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Sales by payment method (handling split payments)
      const paymentMap = new Map<string, { total: number; count: number }>();
      let totalCashSales = 0;

      transactions?.forEach((tx) => {
        if (tx.is_split_payment && tx.payment_details) {
          // Parse JSONB payment details
          const details = tx.payment_details as any[];
          details.forEach((split: any) => {
            const method = split.method;
            const amount = Number(split.amount);

            const existing = paymentMap.get(method) || { total: 0, count: 0 };
            paymentMap.set(method, {
              total: existing.total + amount,
              // Only count transaction once per method if simpler, or fraction? 
              // For simplicity, we just count relevant methods involved
              count: existing.count + 1
            });

            if (method === 'cash') {
              totalCashSales += amount;
            }
          });
        } else {
          // Single payment
          const method = tx.payment_method;
          const amount = Number(tx.total);

          const existing = paymentMap.get(method) || { total: 0, count: 0 };
          paymentMap.set(method, {
            total: existing.total + amount,
            count: existing.count + 1,
          });

          if (method === 'cash') {
            totalCashSales += amount;
          }
        }
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

      // Calculate Cash Setor (Cash Sales - Expenses)
      // Assuming all expenses are paid via cash for now
      const cashToDeposit = Math.max(0, totalCashSales - totalExpenses);

      setStats({
        totalSales,
        totalTransactions,
        totalExpenses,
        cogs,
        grossProfit,
        netProfit,
        avgTransaction,
        topProducts,
        salesByPayment,
        dailyData,
        // Add calculated fields to state if needed, or compute in render
        cashToDeposit,
      } as any);
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

      // Calculate date range for queries
      const today = new Date();
      let startDate: Date;
      switch (period) {
        case 'week':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 7);
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

      // Fetch all services/products sold (not just top 5)
      let transactionsQuery = supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .gte('created_at', startDate.toISOString());

      if (reportOutletId !== 'all') {
        transactionsQuery = transactionsQuery.eq('outlet_id', reportOutletId);
      }

      const { data: txData } = await transactionsQuery;

      const allProductsMap = new Map<string, { quantity: number; revenue: number }>();
      txData?.forEach((tx) => {
        tx.transaction_items?.forEach((item: any) => {
          const existing = allProductsMap.get(item.product_name) || { quantity: 0, revenue: 0 };
          allProductsMap.set(item.product_name, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + Number(item.subtotal),
          });
        });
      });

      const allServices = Array.from(allProductsMap.entries())
        .filter(([name]) => name !== undefined && name !== null && name !== 'undefined' && name !== 'null')
        .map(([name, data]) => ({ name: name || 'Unnamed', ...data }))
        .sort((a, b) => b.revenue - a.revenue);

      // Fetch booking statistics
      let bookingsQuery = supabase
        .from('bookings')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (reportOutletId !== 'all') {
        bookingsQuery = bookingsQuery.eq('outlet_id', reportOutletId);
      }

      const { data: bookingsData } = await bookingsQuery;

      const bookingStats = {
        total: bookingsData?.length || 0,
        pending: bookingsData?.filter(b => b.status === 'pending').length || 0,
        confirmed: bookingsData?.filter(b => b.status === 'confirmed').length || 0,
        completed: bookingsData?.filter(b => b.status === 'completed').length || 0,
        canceled: bookingsData?.filter(b => b.status === 'canceled').length || 0,
        totalRevenue: bookingsData?.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + Number(b.payment_amount || 0), 0) || 0,
      };

      // Fetch expenses for PDF details
      let expensesPdfQuery = supabase
        .from('expenses')
        .select('*')
        .eq('status', 'approved')
        .gte('created_at', startDate.toISOString());

      if (reportOutletId !== 'all') {
        expensesPdfQuery = expensesPdfQuery.eq('outlet_id', reportOutletId);
      }

      const { data: expensesPdfData } = await expensesPdfQuery;

      const expenseDetails = (expensesPdfData || []).map(exp => ({
        date: exp.expense_date || exp.created_at,
        category: exp.category,
        description: exp.description || '',
        amount: Number(exp.amount)
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
        allServices,
        bookingStats,
        expenseDetails,
      };

      await generateReportPDF(reportData);
      toast({ title: 'Berhasil', description: 'Laporan PDF berhasil diunduh (2 halaman)' });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Error', description: `Gagal membuat PDF: ${error?.message || 'Unknown error'}`, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const fetchClosingData = async () => {
    if (!reportOutletId || reportOutletId === 'all') {
      toast({ title: 'Error', description: 'Pilih outlet spesifik untuk melakukan closing', variant: 'destructive' });
      return;
    }

    try {
      // Fetch stats for the specific closing date
      const startDate = new Date(closingDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(closingDate);
      endDate.setHours(23, 59, 59, 999);

      // Transactions
      const { data: transactions } = await (supabase as any)
        .from('transactions')
        .select('*')
        .eq('outlet_id', reportOutletId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('outlet_id', reportOutletId)
        .eq('status', 'approved')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const totalSales = transactions?.reduce((sum: number, t: any) => sum + Number(t.total), 0) || 0;
      const totalExpenses = expenses?.reduce((sum: number, e: any) => sum + Number(e.amount), 0) || 0;

      let cashSales = 0;
      let qrisSales = 0;
      let transferSales = 0;
      let selfOlshopSales = 0;

      transactions?.forEach((tx: any) => {
        if (tx.is_split_payment && tx.payment_details) {
          const details = tx.payment_details as any[];
          details.forEach((split: any) => {
            if (split.method === 'cash') cashSales += Number(split.amount);
            else if (split.method === 'qris') qrisSales += Number(split.amount);
            else if (split.method === 'transfer') transferSales += Number(split.amount);
            else if (split.method === 'olshop') selfOlshopSales += Number(split.amount);
          });
        } else {
          if (tx.payment_method === 'cash') cashSales += Number(tx.total);
          else if (tx.payment_method === 'qris') qrisSales += Number(tx.total);
          else if (tx.payment_method === 'transfer') transferSales += Number(tx.total);
          else if (tx.payment_method === 'olshop') selfOlshopSales += Number(tx.total);
        }
      });

      const nonCashSales = qrisSales + transferSales + selfOlshopSales;
      const cashToDeposit = Math.max(0, cashSales - totalExpenses);

      setClosingStats({
        totalSales,
        cashSales,
        nonCashSales,
        expenses: totalExpenses,
        cashToDeposit,
      });

      // Check if closing already exists
      const { data: existingClosing } = await supabase
        .from('daily_closings')
        .select('*')
        .eq('outlet_id', reportOutletId)
        .eq('closing_date', closingDate)
        .single();

      if (existingClosing) {
        setClosingData(existingClosing);
        setActualCash(String(existingClosing.closing_cash));
        setClosingNotes(existingClosing.notes || '');
      } else {
        setClosingData(null);
        setActualCash('');
        setClosingNotes('');
      }

      setShowClosingDialog(true);
    } catch (error) {
      console.error('Error fetching closing data:', error);
      toast({ title: 'Error', description: 'Gagal mengambil data closing', variant: 'destructive' });
    }
  };

  const handleSaveClosing = async () => {
    if (!reportOutletId || reportOutletId === 'all') return;
    if (!actualCash) {
      toast({ title: 'Error', description: 'Masukkan jumlah uang fisik (aktual)', variant: 'destructive' });
      return;
    }

    try {
      const actual = parseFloat(actualCash);
      const discrepancy = actual - closingStats.cashToDeposit;

      const closingPayload = {
        outlet_id: reportOutletId,
        closing_date: closingDate,
        total_sales: closingStats.totalSales,
        cash_sales: closingStats.cashSales,
        total_expenses: closingStats.expenses,
        cash_to_deposit: closingStats.cashToDeposit,
        closing_cash: actual,
        discrepancy,
        notes: closingNotes,
      };

      if (closingData) {
        // Update
        await supabase
          .from('daily_closings')
          .update(closingPayload)
          .eq('id', closingData.id);
        toast({ title: 'Berhasil', description: 'Laporan closing berhasil diperbarui' });
      } else {
        // Insert
        await supabase
          .from('daily_closings')
          .insert(closingPayload);
        toast({ title: 'Berhasil', description: 'Laporan closing berhasil disimpan' });
      }
      setShowClosingDialog(false);
    } catch (error: any) {
      console.error('Error saving closing:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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

            <Button variant="outline" onClick={fetchClosingData} disabled={reportOutletId === 'all'}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Closing Harian
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <p className="text-sm text-muted-foreground">HPP (Harga Pokok)</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.cogs)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Cost of Goods Sold</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Package className="h-6 w-6 text-orange-600" />
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
                  <p className="text-xs text-muted-foreground mt-1">Penjualan - HPP</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-secondary-foreground" />
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
                  <p className="text-xs text-muted-foreground mt-1">Operational Expenses</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-destructive" />
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
                  <p className="text-xs text-muted-foreground mt-1">Gross Profit - Expenses</p>
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

          <Card className="card-warm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Profit Margin</p>
                  <p className="text-2xl font-bold mt-1">{profitMargin.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Net Profit / Penjualan</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deposit Calculation Card */}
        <Card className="card-warm border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-blue-800">
              <DollarSign className="h-5 w-5" />
              Perhitungan Setoran Tunai (Cash Deposit)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">Total Penjualan Tunai</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(stats.salesByPayment.find(p => p.method === 'cash')?.total || 0)}
                </p>
              </div>
              <div className="flex items-center justify-center">
                <div className="bg-white p-2 rounded-full border shadow-sm">
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">Total Pengeluaran (Expenses)</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
              </div>
              <div className="p-4 bg-blue-100 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-800 mb-1">Total Cash Setor</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatCurrency(stats.cashToDeposit)}
                </p>
                <p className="text-xs text-blue-600 mt-1">Cash Sales - Expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>

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

        {/* Visualisasi Grafis - Perbandingan Finansial */}
        <Card className="card-warm">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Visualisasi Perbandingan Finansial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Revenue vs Expenses vs Profit Chart */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Perbandingan Revenue, HPP, Expenses & Profit</h3>
                <div className="space-y-2">
                  {/* Total Sales Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Total Penjualan</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(stats.totalSales)}</span>
                    </div>
                    <div className="w-full h-8 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${stats.totalSales > 0 ? 100 : 0}%` }}
                      >
                        <span className="text-xs text-white font-medium">100%</span>
                      </div>
                    </div>
                  </div>

                  {/* HPP Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">HPP (COGS)</span>
                      <span className="font-semibold text-orange-600">{formatCurrency(stats.cogs)}</span>
                    </div>
                    <div className="w-full h-8 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${stats.totalSales > 0 ? (stats.cogs / stats.totalSales * 100) : 0}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {stats.totalSales > 0 ? ((stats.cogs / stats.totalSales * 100).toFixed(1)) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expenses Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Total Pengeluaran</span>
                      <span className="font-semibold text-red-600">{formatCurrency(stats.totalExpenses)}</span>
                    </div>
                    <div className="w-full h-8 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-red-500 transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${stats.totalSales > 0 ? (stats.totalExpenses / stats.totalSales * 100) : 0}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {stats.totalSales > 0 ? ((stats.totalExpenses / stats.totalSales * 100).toFixed(1)) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Gross Profit Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Gross Profit</span>
                      <span className="font-semibold text-green-600">{formatCurrency(stats.grossProfit)}</span>
                    </div>
                    <div className="w-full h-8 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${stats.totalSales > 0 ? (stats.grossProfit / stats.totalSales * 100) : 0}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {stats.totalSales > 0 ? ((stats.grossProfit / stats.totalSales * 100).toFixed(1)) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Net Profit Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Net Profit</span>
                      <span className={`font-semibold ${stats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(stats.netProfit)}
                      </span>
                    </div>
                    <div className="w-full h-8 bg-muted rounded overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 flex items-center justify-end pr-2 ${stats.netProfit >= 0 ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        style={{ width: `${stats.totalSales > 0 ? Math.abs(stats.netProfit / stats.totalSales * 100) : 0}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {stats.totalSales > 0 ? ((stats.netProfit / stats.totalSales * 100).toFixed(1)) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Gross Margin</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.totalSales > 0 ? ((stats.grossProfit / stats.totalSales * 100).toFixed(1)) : 0}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Net Margin</p>
                  <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {stats.totalSales > 0 ? ((stats.netProfit / stats.totalSales * 100).toFixed(1)) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Daily Closing Dialog */}
      <Dialog open={showClosingDialog} onOpenChange={setShowClosingDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display">Laporan Closing Harian</DialogTitle>
            <DialogDescription>
              {getSelectedOutletName()} - {new Date(closingDate).toLocaleDateString('id-ID', { dateStyle: 'full' })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-4 col-span-2 md:col-span-1">
              <div className="space-y-2">
                <Label>Tanggal Closing</Label>
                <Input
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                />
                <Button size="sm" variant="secondary" className="w-full mt-1" onClick={fetchClosingData}>
                  Reload Data
                </Button>
              </div>

              <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Penjualan:</span>
                  <span className="font-medium">{formatCurrency(closingStats.totalSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tunai (Cash):</span>
                  <span className="font-medium text-green-600">{formatCurrency(closingStats.cashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Non-Tunai:</span>
                  <span className="font-medium text-blue-600">{formatCurrency(closingStats.nonCashSales)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span>Pengeluaran:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(closingStats.expenses)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 col-span-2 md:col-span-1">
              <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                <h4 className="font-semibold text-primary mb-2">Target Setoran</h4>
                <div className="text-3xl font-bold text-primary">{formatCurrency(closingStats.cashToDeposit)}</div>
                <p className="text-xs text-muted-foreground mt-1">Cash Sales - Expenses</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="actualCash">Uang Fisik Diterima</Label>
                <Input
                  id="actualCash"
                  type="number"
                  placeholder="0"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="font-semibold"
                />
              </div>

              {actualCash && (
                <div className={`p-2 rounded text-sm flex justify-between ${parseFloat(actualCash) - closingStats.cashToDeposit === 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
                  }`}>
                  <span>Selisih:</span>
                  <span className="font-bold">
                    {formatCurrency(parseFloat(actualCash) - closingStats.cashToDeposit)}
                  </span>
                </div>
              )}
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Catatan</Label>
              <Textarea
                placeholder="Catatan tambahan..."
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClosingDialog(false)}>Batal</Button>
            <Button onClick={handleSaveClosing}>
              <Save className="h-4 w-4 mr-2" />
              Simpan Closing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
