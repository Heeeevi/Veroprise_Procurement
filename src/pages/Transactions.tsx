import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useOutlet } from '@/hooks/useOutlet';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Search, Filter } from 'lucide-react';

export default function Transactions() {
  const { selectedOutlet } = useOutlet();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('today');

  useEffect(() => {
    if (selectedOutlet) {
      fetchTransactions();
    }
  }, [selectedOutlet, dateFilter]);

  const fetchTransactions = async () => {
    if (!selectedOutlet) return;

    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          profiles:user_id(full_name),
          transaction_items(*)
        `)
        .eq('outlet_id', selectedOutlet.id)
        .order('created_at', { ascending: false });

      // Apply date filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === 'today') {
        query = query.gte('created_at', today.toISOString());
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      const { data } = await query.limit(100);
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentBadge = (method: string) => {
    const colors: Record<string, string> = {
      cash: 'bg-accent text-accent-foreground',
      qris: 'bg-info text-info-foreground',
      transfer: 'bg-primary',
      card: 'bg-secondary text-secondary-foreground',
    };
    return <Badge className={colors[method] || ''}>{method.toUpperCase()}</Badge>;
  };

  const filteredTransactions = transactions.filter(
    (tx) =>
      tx.transaction_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSales = filteredTransactions.reduce((sum, tx) => sum + Number(tx.total), 0);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Transaksi</h1>
            <p className="text-muted-foreground">Riwayat penjualan {selectedOutlet?.name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Penjualan</p>
            <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
          </div>
        </div>

        <Card className="card-warm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari transaksi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="week">7 Hari</SelectItem>
                  <SelectItem value="month">30 Hari</SelectItem>
                  <SelectItem value="all">Semua</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Transaksi</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Kasir</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-sm">{tx.transaction_number}</TableCell>
                    <TableCell>{formatDateTime(tx.created_at)}</TableCell>
                    <TableCell>{tx.profiles?.full_name || '-'}</TableCell>
                    <TableCell>{tx.transaction_items?.length || 0} item</TableCell>
                    <TableCell>{getPaymentBadge(tx.payment_method)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(tx.total)}</TableCell>
                  </TableRow>
                ))}
                {filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Tidak ada transaksi
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
