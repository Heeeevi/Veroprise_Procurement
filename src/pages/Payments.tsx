import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreditCard, Plus, ArrowDownToLine, Trash, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Payments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newPayment, setNewPayment] = useState({ client: '', amount: '', type: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Gagal Memuat Data', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEntry = async () => {
    if (!newPayment.client || !newPayment.amount || !newPayment.type) return;
    setIsSubmitting(true);
    try {
      const payload = {
        payment_number: `PAY-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        client_name: newPayment.client,
        amount: parseInt(newPayment.amount),
        payment_type: newPayment.type,
        payment_date: new Date().toISOString().split('T')[0]
      };
      
      const { error } = await (supabase as any).from('payments').insert([payload]);
      if (error) throw error;
      
      toast({ title: 'Berhasil', description: 'Penerimaan berhasil dicatat' });
      setShowDialog(false);
      setNewPayment({ client: '', amount: '', type: '' });
      fetchPayments();
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Yakin ingin menghapus ${selectedIds.length} riwayat pembayaran secara permanen?`)) return;
    try {
      const { error } = await (supabase as any)
        .from('payments')
        .delete()
        .in('id', selectedIds);
        
      if (error) throw error;
      
      toast({ title: 'Berhasil', description: 'Data pembayaran berhasil dihapus' });
      setSelectedIds([]);
      fetchPayments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const toggleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(item => item !== id));
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <CreditCard className="h-6 w-6" /> Payment Entry
            </h1>
            <p className="text-muted-foreground">Catat penerimaan pembayaran dari Klien</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button variant="destructive" onClick={handleBulkDelete}>
                <Trash className="w-4 h-4 mr-2" /> Hapus {selectedIds.length} Terpilih
              </Button>
            )}
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Terima Pembayaran
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
             <CardTitle>Riwayat Pembayaran</CardTitle>
             <CardDescription>Penerimaan DP, Termin, dan Pelunasan Catering.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {loading ? (
               <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
             ) : payments.length === 0 ? (
               <div className="py-12 text-center text-muted-foreground">Belum ada riwayat pembayaran yang di-entry.</div>
             ) : (
               payments.map((pay) => (
                 <div key={pay.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg bg-card gap-4">
                   <div className="flex items-start gap-4">
                     <div className="pt-2">
                       <Checkbox 
                         checked={selectedIds.includes(pay.id)} 
                         onCheckedChange={(c) => toggleSelect(pay.id, !!c)} 
                       />
                     </div>
                     <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                       <ArrowDownToLine className="w-6 h-6" />
                     </div>
                     <div>
                       <h4 className="font-bold">{pay.payment_number}</h4>
                       <p className="text-sm text-muted-foreground">Klien: {pay.client_name} ({pay.payment_type})</p>
                       <p className="text-xs text-muted-foreground mt-1">Diterima: {pay.payment_date}</p>
                     </div>
                   </div>
                   <div className="mt-4 md:mt-0 text-right">
                     <p className="font-bold text-lg text-green-600">+ Rp {Number(pay.amount).toLocaleString('id-ID')}</p>
                     <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium mt-1">
                       Sukses
                     </span>
                   </div>
                 </div>
               ))
             )}
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Catat Pembayaran Baru</DialogTitle>
              <DialogDescription>Catat DP (Down Payment) atau pelunasan dari klien B2B / Katering.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Klien Pengirim</Label>
                <Input placeholder="cth: PT. Sukses Selalu" value={newPayment.client} onChange={(e) => setNewPayment({...newPayment, client: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Tipe Pembayaran</Label>
                <Input placeholder="cth: DP 30% atau Pelunasan" value={newPayment.type} onChange={(e) => setNewPayment({...newPayment, type: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Nominal Diterima (Rp)</Label>
                <Input type="number" placeholder="cth: 3000000" value={newPayment.amount} onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button onClick={handleEntry} disabled={isSubmitting}>{isSubmitting ? 'Loading...' : 'Simpan Penerimaan'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
