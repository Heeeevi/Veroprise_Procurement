import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Plus, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Invoices() {
  const [invoices, setInvoices] = useState([
    { id: 'INV-2024-001', client: 'PT. Sejahtera Abadi', amount: 15000000, status: 'Unpaid', date: '2024-04-14' }
  ]);
  const [showDialog, setShowDialog] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ client: '', amount: '' });

  const handleCreate = () => {
    if (!newInvoice.client || !newInvoice.amount) return;
    setInvoices([{
      id: `INV-2024-00${invoices.length + 2}`,
      client: newInvoice.client,
      amount: parseInt(newInvoice.amount),
      status: 'Unpaid',
      date: new Date().toISOString().split('T')[0]
    }, ...invoices]);
    setShowDialog(false);
    setNewInvoice({ client: '', amount: '' });
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
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> Buat Invoice Baru
          </Button>
        </div>

        <Card>
          <CardHeader>
             <CardTitle>Daftar Invoice Aktif</CardTitle>
             <CardDescription>Modul penagihan yang telah di-{`generate`}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {invoices.length === 0 ? (
               <div className="py-12 text-center text-muted-foreground">Belum ada data Invoice terhutang.</div>
             ) : (
               invoices.map((inv) => (
                 <div key={inv.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg bg-card">
                   <div className="flex items-start gap-4">
                     <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                       <FileCheck className="w-6 h-6" />
                     </div>
                     <div>
                       <h4 className="font-bold">{inv.id}</h4>
                       <p className="text-sm text-muted-foreground">Klien: {inv.client}</p>
                       <p className="text-xs text-muted-foreground mt-1">Tanggal: {inv.date}</p>
                     </div>
                   </div>
                   <div className="mt-4 md:mt-0 text-right">
                     <p className="font-bold text-lg">Rp {inv.amount.toLocaleString('id-ID')}</p>
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
              <Button onClick={handleCreate}>Buat Invoice</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
