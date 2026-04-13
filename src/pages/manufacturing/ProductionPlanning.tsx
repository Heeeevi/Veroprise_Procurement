import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarRange, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOutlet } from '@/hooks/useOutlet';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDateTime } from '@/lib/utils';


export default function ProductionPlanning() {
  const { selectedOutlet } = useOutlet();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);

  const handlePullSalesOrders = async () => {
    if (!selectedOutlet?.id) {
      toast({ title: 'Error', description: 'Pilih outlet terlebih dahulu', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, transaction_number, created_at, total, payment_status')
        .eq('outlet_id', selectedOutlet.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setSalesOrders(data || []);
      toast({
        title: 'Berhasil',
        description: `${data?.length || 0} data sales orders berhasil ditarik.`,
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal menarik data sales orders', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <CalendarRange className="h-6 w-6" /> Production Planning
            </h1>
            <p className="text-muted-foreground">Rencanakan jadwal masak berdasarkan Pesanan Pelanggan (Sales Orders)</p>
          </div>
          <Button onClick={handlePullSalesOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Tarik Data Sales Orders
          </Button>
        </div>



        <Card>
          <CardHeader>
             <CardTitle>Jadwal Produksi Harian</CardTitle>
             <CardDescription>Pesan material (MRP) otomatis berdasarkan rekap Sales Order.</CardDescription>
          </CardHeader>
          <CardContent className="py-12 text-center text-muted-foreground">
             Modul MRP (Material Requirement Planning) sedang dikonfigurasi. Belum ada jadwal produksi hari ini.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Sales Orders Terakhir</CardTitle>
            <CardDescription>
              Menampilkan maksimal 20 transaksi outlet aktif sebagai sumber data planning.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {salesOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data. Klik "Tarik Data Sales Orders" terlebih dahulu.</p>
            ) : (
              <div className="space-y-3">
                {salesOrders.map((order) => (
                  <div key={order.id} className="flex flex-col md:flex-row md:items-center md:justify-between border rounded-lg p-3 gap-2">
                    <div>
                      <p className="font-medium">{order.transaction_number}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                    </div>
                    <div className="text-sm font-semibold">{formatCurrency(Number(order.total || 0))}</div>
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
