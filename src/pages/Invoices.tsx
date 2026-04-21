import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Plus, FileCheck, Trash, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Invoices() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ client: '', amount: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Gagal Memuat Data', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newInvoice.client || !newInvoice.amount) return;
    setIsSubmitting(true);
    try {
      const payload = {
        invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        client_name: newInvoice.client,
        amount: parseInt(newInvoice.amount),
        status: 'Unpaid',
        issue_date: new Date().toISOString().split('T')[0]
      };
      
      const { error } = await (supabase as any).from('invoices').insert([payload]);
      if (error) throw error;
      
      toast({ title: 'Berhasil', description: 'Invoice berhasil diterbitkan' });
      setShowDialog(false);
      setNewInvoice({ client: '', amount: '' });
      fetchInvoices();
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Yakin ingin menghapus ${selectedIds.length} invoice terpilih secara permanen?`)) return;
    try {
      const { error } = await (supabase as any)
        .from('invoices')
        .delete()
        .in('id', selectedIds);
        
      if (error) throw error;
      
      toast({ title: 'Berhasil', description: 'Data berhasil dihapus dari sistem' });
      setSelectedIds([]);
      fetchInvoices();
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
              <FileText className="h-6 w-6" /> Invoice (Outbound)
            </h1>
            <p className="text-muted-foreground">Kelola penagihan pembayaran ke klien catering</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button variant="destructive" onClick={handleBulkDelete}>
                <Trash className="w-4 h-4 mr-2" /> Hapus {selectedIds.length} Terpilih
              </Button>
            )}
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Buat Invoice Baru
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
             <CardTitle>Daftar Invoice Aktif</CardTitle>
             <CardDescription>Modul penagihan yang telah di-{`generate`}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {loading ? (
               <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
             ) : invoices.length === 0 ? (
               <div className="py-12 text-center text-muted-foreground">Belum ada data Invoice terhutang.</div>
             ) : (
               invoices.map((inv) => (
                 <div key={inv.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg bg-card gap-4">
                   <div className="flex items-start gap-4">
                     <div className="pt-2">
                       <Checkbox 
                         checked={selectedIds.includes(inv.id)} 
                         onCheckedChange={(c) => toggleSelect(inv.id, !!c)} 
                       />
                     </div>
                     <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                       <FileCheck className="w-6 h-6" />
                     </div>
                     <div>
                       <h4 className="font-bold">{inv.invoice_number}</h4>
                       <p className="text-sm text-muted-foreground">Klien: {inv.client_name}</p>
                       <p className="text-xs text-muted-foreground mt-1">Tanggal: {inv.issue_date}</p>
                     </div>
                   </div>
                   <div className="mt-4 md:mt-0 text-right">
                     <p className="font-bold text-lg">Rp {Number(inv.amount).toLocaleString('id-ID')}</p>
                     <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium mt-1">
                       {inv.status}
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
              <DialogTitle>Terbitkan Invoice Baru</DialogTitle>
              <DialogDescription>Masukkan detail penagihan klien untuk pesanan katering.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Klien / Instansi</Label>
                <Input placeholder="cth: PT. Maju Bersama" value={newInvoice.client} onChange={(e) => setNewInvoice({...newInvoice, client: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Total Tagihan (Rp)</Label>
                <Input type="number" placeholder="cth: 5000000" value={newInvoice.amount} onChange={(e) => setNewInvoice({...newInvoice, amount: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? 'Loading...' : 'Buat Invoice'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
