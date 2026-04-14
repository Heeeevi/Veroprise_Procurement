import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreditCard, Plus, ArrowDownToLine, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function Payments() {
  const [payments, setPayments] = useState([
    { id: 'PAY-2024-001', client: 'PT. Sejahtera Abadi', amount: 5000000, type: 'DP Termin 1', date: '2024-04-14' }
  ]);
  const [showDialog, setShowDialog] = useState(false);
  const [newPayment, setNewPayment] = useState({ client: '', amount: '', type: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleEntry = () => {
    if (!newPayment.client || !newPayment.amount || !newPayment.type) return;
    setPayments([{
      id: `PAY-2024-00${payments.length + 2}`,
      client: newPayment.client,
      amount: parseInt(newPayment.amount),
      type: newPayment.type,
      date: new Date().toISOString().split('T')[0]
    }, ...payments]);
    setShowDialog(false);
    setNewPayment({ client: '', amount: '', type: '' });
  };

  const handleBulkDelete = () => {
    if (!confirm(`Yakin ingin menghapus ${selectedIds.length} riwayat pembayaran terpilih?`)) return;
    setPayments(payments.filter(p => !selectedIds.includes(p.id)));
    setSelectedIds([]);
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
             {payments.length === 0 ? (
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
                       <h4 className="font-bold">{pay.id}</h4>
                       <p className="text-sm text-muted-foreground">Klien: {pay.client} ({pay.type})</p>
                       <p className="text-xs text-muted-foreground mt-1">Diterima: {pay.date}</p>
                     </div>
                   </div>
                   <div className="mt-4 md:mt-0 text-right">
                     <p className="font-bold text-lg text-green-600">+ Rp {pay.amount.toLocaleString('id-ID')}</p>
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
              <Button onClick={handleEntry}>Simpan Penerimaan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
