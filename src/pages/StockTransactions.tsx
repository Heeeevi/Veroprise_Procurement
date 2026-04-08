import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, Search, Activity } from 'lucide-react';

export default function StockTransactions() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    fetchMovements();
  }, [selectedWarehouse]);

  const fetchWarehouses = async () => {
    try {
      const { data } = await (supabase as any).from('warehouses').select('id, name').order('name');
      if (data) setWarehouses(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMovements = async () => {
    try {
      setLoading(true);
      let query = (supabase as any)
        .from('warehouse_stock_movements')
        .select(`
          *,
          warehouse:warehouses!warehouse_id(name),
          product:products!product_id(name, base_unit),
          profile:profiles!performed_by(full_name)
        `)
        .order('movement_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200);

      if (selectedWarehouse && selectedWarehouse !== 'all') {
        query = query.eq('warehouse_id', selectedWarehouse);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMovements(data || []);
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = movements.filter((m) => {
    const term = searchQuery.toLowerCase();
    return (
      m.product?.name?.toLowerCase().includes(term) ||
      m.note?.toLowerCase().includes(term) ||
      m.reference_table?.toLowerCase().includes(term)
    );
  });

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <Activity className="h-6 w-6" /> Stock Ledger (Mutasi)
            </h1>
            <p className="text-muted-foreground">Lacak pergerakan In/Out dan referensi transaksinya</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 w-full relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Cari produk, catatan, atau referensi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full md:w-64">
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Gudang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Gudang</SelectItem>
                    {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Gudang</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Mutasi</TableHead>
                    <TableHead>Keterangan / Ref</TableHead>
                    <TableHead>PIC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Tidak ada riwayat pergerakan stok</TableCell>
                    </TableRow>
                  ) : filteredMovements.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">
                        {format(new Date(m.movement_date || m.created_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{m.warehouse?.name}</TableCell>
                      <TableCell className="font-medium">{m.product?.name}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {m.movement_type === 'stock_in' ? (
                           <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                             <ArrowDownRight className="w-3 h-3 mr-1" /> + {Number(m.quantity)} {m.product?.base_unit}
                           </Badge>
                        ) : (
                           <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                             <ArrowUpRight className="w-3 h-3 mr-1" /> - {Number(m.quantity)} {m.product?.base_unit}
                           </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{m.note || '-'}</div>
                        {m.reference_table && (
                           <div className="text-xs text-muted-foreground mt-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded inline-block">
                             Ref: {m.reference_table}
                           </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.profile?.full_name || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
