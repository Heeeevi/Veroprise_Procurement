import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ArrowDownRight, ScissorsLineDashed } from 'lucide-react';
import { format } from 'date-fns';


export default function Disassembly() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [disassemblies, setDisassemblies] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Form State
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    source_product_id: '',
    source_warehouse_id: '',
    target_warehouse_id: '',
    quantity_used: '1',
    notes: '',
  });

  const [outputItems, setOutputItems] = useState<{ result_product_id: string; quantity_produced: string; cost_allocation_percentage: string }[]>([
    { result_product_id: '', quantity_produced: '', cost_allocation_percentage: '100' }
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [disRes, prodRes, whRes] = await Promise.all([
        (supabase as any)
          .from('disassemblies')
          .select('*, source_product:products!source_product_id(name), source_warehouse:warehouses!source_warehouse_id(name), target_warehouse:warehouses!target_warehouse_id(name), items:disassembly_items(*, result_product:products(name))')
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('products')
          .select('id, name, base_unit')
          .eq('is_active', true)
          .eq('is_service', false)
          .order('name'),
        (supabase as any)
          .from('warehouses')
          .select('id, name')
          .order('name')
      ]);

      if (disRes.error) throw disRes.error;
      if (prodRes.error) throw prodRes.error;
      if (whRes.error) throw whRes.error;

      setDisassemblies(disRes.data || []);
      setProducts(prodRes.data || []);
      setWarehouses(whRes.data || []);
    } catch (error: any) {
      toast({ title: 'Gagal Memuat Data', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddOutput = () => {
    setOutputItems([...outputItems, { result_product_id: '', quantity_produced: '', cost_allocation_percentage: '0' }]);
  };

  const updateOutputItem = (index: number, patch: any) => {
    setOutputItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const removeOutputItem = (index: number) => {
    if (outputItems.length > 1) {
      setOutputItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.source_product_id || !formData.source_warehouse_id || !formData.target_warehouse_id) {
        throw new Error("Lengkapi data Sumber, Gudang Asal, dan Gudang Tujuan.");
      }

      const validOutputs = outputItems.filter(o => o.result_product_id && Number(o.quantity_produced) > 0);
      if (validOutputs.length === 0) {
        throw new Error("Harus ada minimal 1 produk hasil pemotongan yang valid.");
      }

      const totalPercentage = validOutputs.reduce((sum, item) => sum + (Number(item.cost_allocation_percentage) || 0), 0);
      if (totalPercentage !== 100) {
        throw new Error(`Total Alokasi HPP harus 100%. Saat ini: ${totalPercentage}%`);
      }

      setIsSubmitting(true);
      const user = (await supabase.auth.getUser()).data.user;

      // 1. Insert Header
      const { data: disassembly, error: headerError } = await (supabase as any)
        .from('disassemblies')
        .insert({
          disassembly_number: `DIS-${Date.now()}`,
          source_product_id: formData.source_product_id,
          source_warehouse_id: formData.source_warehouse_id,
          target_warehouse_id: formData.target_warehouse_id,
          quantity_used: Number(formData.quantity_used),
          status: 'completed',
          performed_by: user?.id,
          completed_at: new Date().toISOString(),
          notes: formData.notes
        })
        .select()
        .single();

      if (headerError) throw headerError;

      // 2. Insert Items
      const itemsPayload = validOutputs.map(o => ({
        disassembly_id: disassembly.id,
        result_product_id: o.result_product_id,
        quantity_produced: Number(o.quantity_produced),
        cost_allocation_percentage: Number(o.cost_allocation_percentage)
      }));

      const { error: itemsError } = await (supabase as any).from('disassembly_items').insert(itemsPayload);
      if (itemsError) throw itemsError;

      // 3. Update Inventory (Kandang dipotong)
      await updateInventory(formData.source_warehouse_id, formData.source_product_id, -Number(formData.quantity_used));

      // 4. Update Inventory (Cold storage ditambah)
      for (const out of validOutputs) {
        await updateInventory(formData.target_warehouse_id, out.result_product_id, Number(out.quantity_produced));
      }

      toast({ title: 'Sukses', description: 'Transaksi Pemotongan & Mutasi Stok Berhasil.' });
      setShowDialog(false);
      
      // Reset Form
      setFormData({
        source_product_id: '',
        source_warehouse_id: '',
        target_warehouse_id: '',
        quantity_used: '1',
        notes: '',
      });
      setOutputItems([{ result_product_id: '', quantity_produced: '', cost_allocation_percentage: '100' }]);
      fetchData();

    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateInventory = async (warehouseId: string, productId: string, qtyDelta: number) => {
    // Cek apakah ada record inventory
    const { data: inv } = await (supabase as any)
      .from('warehouse_inventory')
      .select('id, quantity')
      .eq('warehouse_id', warehouseId)
      .eq('product_id', productId)
      .maybeSingle();

    if (inv) {
      // Update
      await (supabase as any)
        .from('warehouse_inventory')
        .update({ quantity: Number(inv.quantity) + qtyDelta })
        .eq('id', inv.id);
    } else if (qtyDelta > 0) {
      // Create new (jika minus dan belum ada, idealnya dicegah di awal, tapi sbg contoh kita handle)
      await (supabase as any)
        .from('warehouse_inventory')
        .insert({
          warehouse_id: warehouseId,
          product_id: productId,
          quantity: qtyDelta,
          min_stock: 0,
          cost_per_unit: 0
        });
    }
    
    // Audit Movement Log
    await (supabase as any)
        .from('warehouse_stock_movements')
        .insert({
            warehouse_id: warehouseId,
            product_id: productId,
            movement_type: qtyDelta > 0 ? 'stock_in' : 'stock_out',
            quantity: Math.abs(qtyDelta),
            reference_table: 'disassemblies',
            note: qtyDelta > 0 ? `Hasil Pemotongan (Disassembly)` : `Bahan Pemotongan (Disassembly)`
        });
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <ScissorsLineDashed className="h-6 w-6" /> Disassembly / Pemotongan
            </h1>
            <p className="text-muted-foreground">Konversi hewan hidup ke daging/karkas/jeroan</p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> Proses Potong Baru
          </Button>
        </div>



        {loading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto my-12" />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pemotongan</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor Transaksi</TableHead>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Input Asal</TableHead>
                    <TableHead>Qty Input</TableHead>
                    <TableHead>Rincian Output</TableHead>
                    <TableHead>Status / Oleh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disassemblies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Belum ada transaksi pemotongan</TableCell>
                    </TableRow>
                  ) : disassemblies.map(trx => (
                    <TableRow key={trx.id}>
                      <TableCell className="font-mono text-xs">{trx.disassembly_number}</TableCell>
                      <TableCell>{format(new Date(trx.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <div className="font-medium">{trx.source_product?.name}</div>
                        <div className="text-xs text-muted-foreground">Dari: {trx.source_warehouse?.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{trx.quantity_used} Ekor</Badge>
                      </TableCell>
                      <TableCell>
                        <ul className="text-sm space-y-1">
                          {trx.items?.map((item: any) => (
                            <li key={item.id} className="flex justify-between border-b pb-1">
                              <span>{item.result_product?.name}</span>
                              <span className="font-medium text-green-600">+{item.quantity_produced}</span>
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell>
                         <Badge variant="default" className="bg-green-600">Selesai</Badge>
                         <div className="text-xs text-muted-foreground mt-1 text-center">Tujuan: {trx.target_warehouse?.name}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Dialog Add Disassembly */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buat Transaksi Pemotongan Baru</DialogTitle>
              <DialogDescription>
                Pilih hewan/bahan baku yang dipotong, informasikan dari mana asal hewan, dan ke mana hasil produk disalurkan (Cold Storage).
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-6">
              {/* INPUT SECTION */}
              <div className="space-y-4 border p-4 rounded-lg bg-red-50/50">
                <h3 className="font-semibold text-red-800 flex items-center"><ArrowDownRight className="w-4 h-4 mr-1" /> Input Bahan (Diproses / Berkurang)</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label>Stok Asal Pemotongan</Label>
                    <Select value={formData.source_product_id} onValueChange={(v) => setFormData({...formData, source_product_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Pilih Hewan/Bahan..." /></SelectTrigger>
                      <SelectContent>
                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                     <Label>Qty Dipotong</Label>
                     <Input type="number" min="1" value={formData.quantity_used} onChange={(e) => setFormData({...formData, quantity_used: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <Label>Gudang Asal (ex: Kandang)</Label>
                     <Select value={formData.source_warehouse_id} onValueChange={(v) => setFormData({...formData, source_warehouse_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Pilih Kandang..." /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* OUTPUT SECTION */}
              <div className="space-y-4 border p-4 rounded-lg bg-green-50/50">
                <h3 className="font-semibold text-green-800 flex items-center"><Plus className="w-4 h-4 mr-1" /> Output Hasil (Bertambah)</h3>
                
                <div className="space-y-2">
                   <Label>Gudang Tujuan Penerimaan Hasil (ex: Cold Storage)</Label>
                     <Select value={formData.target_warehouse_id} onValueChange={(v) => setFormData({...formData, target_warehouse_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Pilih Gudang Penerima..." /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                </div>

                {outputItems.map((out, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end pt-2 border-t border-green-200">
                    <div className="col-span-5 space-y-1">
                      <Label className="text-xs">Produk Dihasilkan</Label>
                      <Select value={out.result_product_id} onValueChange={(v) => updateOutputItem(idx, {result_product_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Daging/Tulang..." /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Qty (Berdasarkan Timbangan)</Label>
                      <Input type="number" step="0.01" value={out.quantity_produced} onChange={(e) => updateOutputItem(idx, {quantity_produced: e.target.value})} placeholder="0" />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Alokasi HPP (%)</Label>
                      <Input type="number" min="0" max="100" value={out.cost_allocation_percentage} onChange={(e) => updateOutputItem(idx, {cost_allocation_percentage: e.target.value})} placeholder="0" />
                    </div>
                    <div className="col-span-1">
                      <Button variant="ghost" className="text-red-500" onClick={() => removeOutputItem(idx)} disabled={outputItems.length <= 1}>
                         <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button variant="outline" size="sm" onClick={handleAddOutput} className="mt-2 bg-white">
                  <Plus className="w-4 h-4 mr-1" /> Tambah Hasil Lainnya
                </Button>
              </div>

              <div className="space-y-2">
                 <Label>Nomor Ref / Catatan</Label>
                 <Input value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Penyembelihan harian kloter 1..." />
              </div>
              
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isSubmitting}>Batal</Button>
              <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Proses & Mutasi Stok'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
