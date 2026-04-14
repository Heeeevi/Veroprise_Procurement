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
import { Plus, CheckCircle2, PlayCircle, Loader2, ArrowRightCircle, Trash } from 'lucide-react';
import { format } from 'date-fns';

export default function JobCards() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [productsWithBom, setProductsWithBom] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dialog State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedWO, setSelectedWO] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    product_id: '',
    target_quantity: '',
    warehouse_id: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch WOs
      const { data: woData, error: woError } = await (supabase as any)
        .from('work_orders')
        .select(`
          *,
          product:products!product_id(name),
          warehouse:warehouses!warehouse_id(name),
          items:work_order_items(
            *,
            product:products!product_id(name, base_unit)
          )
        `)
        .order('created_at', { ascending: false });

      if (woError) throw woError;

      // Fetch Products that have BOM
      const { data: bomProducts } = await (supabase as any)
        .from('products')
        .select('id, name')
        .eq('is_active', true);

      // Fetch Warehouses
      const { data: whData } = await (supabase as any).from('warehouses').select('id, name');

      setWorkOrders(woData || []);
      setProductsWithBom(bomProducts || []);
      setWarehouses(whData || []);
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWO = async () => {
    try {
      if (!formData.product_id || !formData.target_quantity || !formData.warehouse_id) {
        throw new Error("Lengkapi Kolom Produk, Target, dan Gudang");
      }

      const qty = Number(formData.target_quantity);
      if (qty <= 0) throw new Error("Target Qty tidak valid");

      setIsSubmitting(true);

      // 1. Fetch BOM for the selected product
      const { data: boms } = await (supabase as any)
        .from('product_bom_items')
        .select('ingredient_product_id, quantity, yield_percentage')
        .eq('product_id', formData.product_id);

      if (!boms || boms.length === 0) {
        throw new Error("Produk ini belum memiliki konfigurasi BOM di master produk.");
      }

      const user = (await supabase.auth.getUser()).data.user;

      // 2. Insert Header WO
      const { data: woHeader, error: woError } = await (supabase as any)
        .from('work_orders')
        .insert({
          wo_number: `WO-${Date.now()}`,
          product_id: formData.product_id,
          target_quantity: qty,
          warehouse_id: formData.warehouse_id,
          status: 'planned',
          assigned_to: user?.id,
          notes: formData.notes
        })
        .select()
        .single();

      if (woError) throw woError;

      // 3. Insert WO Items based on BOM * Quantity * Yield Factor
      const itemsPayload = boms.map((bom: any) => {
        let yieldFactor = (bom.yield_percentage || 100) / 100;
        if (yieldFactor <= 0) yieldFactor = 1; // Safeguard

        const actQuantity = (Number(bom.quantity) * qty) / yieldFactor;

        return {
          work_order_id: woHeader.id,
          product_id: bom.ingredient_product_id,
          planned_quantity: actQuantity,
          status: 'pending'
        };
      });

      const { error: itemsError } = await (supabase as any).from('work_order_items').insert(itemsPayload);
      if (itemsError) throw itemsError;

      toast({ title: 'Sukses', description: 'Work Order berhasil dibuat.' });
      setShowCreateDialog(false);
      setFormData({ product_id: '', target_quantity: '', warehouse_id: '', notes: '' });
      fetchData();

    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateWOStatus = async (woId: string, newStatus: string) => {
    try {
      const payload: any = { status: newStatus };
      if (newStatus === 'in_progress') payload.start_time = new Date().toISOString();
      if (newStatus === 'completed') payload.end_time = new Date().toISOString();

      const { error } = await (supabase as any)
        .from('work_orders')
        .update(payload)
        .eq('id', woId);

      if (error) throw error;
      
      // If completed, we must process inventory deducts and adds
      if (newStatus === 'completed') {
         await processJobCardCompletion(woId);
      }

      toast({ title: 'Berhasil', description: `Status berudah ke ${newStatus}` });
      fetchData();
      setShowDetailDialog(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const updatePlayItemStatus = async (itemId: string, picked: boolean) => {
      try {
         const { error } = await (supabase as any)
            .from('work_order_items')
            .update({ status: picked ? 'picked' : 'pending' })
            .eq('id', itemId);
         
         if (error) throw error;

         // Optimistic update of local state
         setSelectedWO((prev: any) => ({
             ...prev,
             items: prev.items.map((i: any) => i.id === itemId ? { ...i, status: picked ? 'picked' : 'pending' } : i)
         }));

      } catch (error: any) {
         toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
  };

  const processJobCardCompletion = async (woId: string) => {
     // Fetch fresh data
     const { data: wo } = await (supabase as any)
        .from('work_orders')
        .select('*, items:work_order_items(*)')
        .eq('id', woId)
        .single();
    
     if (!wo) return;

     // 1. Kurangi bahan (Work Order Items) dari Gudang
     for (const item of wo.items) {
         await updateInventory(wo.warehouse_id, item.product_id, -Number(item.planned_quantity), `Bahan produksi WO #${wo.wo_number}`);
     }

     // 2. Tambahkan produk jadi ke Gudang
     await updateInventory(wo.warehouse_id, wo.product_id, Number(wo.target_quantity), `Hasil produksi WO #${wo.wo_number}`);
  };

  const updateInventory = async (warehouseId: string, productId: string, qtyDelta: number, note: string) => {
    // Cek apakah ada record inventory
    const { data: inv } = await (supabase as any)
      .from('warehouse_inventory')
      .select('id, quantity')
      .eq('warehouse_id', warehouseId)
      .eq('product_id', productId)
      .maybeSingle();

    if (inv) {
      await (supabase as any)
        .from('warehouse_inventory')
        .update({ quantity: Number(inv.quantity) + qtyDelta })
        .eq('id', inv.id);
    } else if (qtyDelta > 0 || qtyDelta < 0) {
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
            reference_table: 'work_orders',
            note: note
        });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Yakin ingin menghapus ${selectedIds.length} Job Cards yang dipilih secara permanen? Data yang berkaitan juga akan ikut terhapus.`)) return;
    
    setIsDeleting(true);
    try {
      const { error } = await (supabase as any)
        .from('work_orders')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;
      
      toast({ title: 'Berhasil', description: `${selectedIds.length} Job Cards berhasil dihapus.` });
      setSelectedIds([]);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(workOrders.map(wo => wo.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned': return <Badge variant="secondary">Planned / Draft</Badge>;
      case 'kitting': return <Badge className="bg-yellow-500">Kitting / Persiapan</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500 text-white">In Progress (Dimasak)</Badge>;
      case 'completed': return <Badge className="bg-green-600">Selesai</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6" /> Job Cards / Work Orders
            </h1>
            <p className="text-muted-foreground">Kelola produksi dapur & pantau WIP(Work In Progress)</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
                <Trash className="w-4 h-4 mr-2" /> Hapus {selectedIds.length} Terpilih
              </Button>
            )}
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Mulai Produksi
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center my-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
           <Card>
             <CardHeader>
               <CardTitle>Daftar Work Orders</CardTitle>
             </CardHeader>
             <CardContent>
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead className="w-12">
                       <Checkbox 
                         checked={selectedIds.length === workOrders.length && workOrders.length > 0} 
                         onCheckedChange={(c) => toggleSelectAll(!!c)} 
                       />
                     </TableHead>
                     <TableHead>No. WO</TableHead>
                     <TableHead>Tgl Rencana</TableHead>
                     <TableHead>Produk Target</TableHead>
                     <TableHead>Target Qty</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead>Gudang/Dapur</TableHead>
                     <TableHead>Aksi</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {workOrders.length === 0 ? (
                      <TableRow>
                         <TableCell colSpan={8} className="text-center py-6">Belum ada Job Card aktif</TableCell>
                      </TableRow>
                   ) : workOrders.map(wo => (
                      <TableRow key={wo.id}>
                         <TableCell>
                           <Checkbox 
                             checked={selectedIds.includes(wo.id)} 
                             onCheckedChange={(c) => toggleSelect(wo.id, !!c)} 
                           />
                         </TableCell>
                         <TableCell className="font-mono text-xs">{wo.wo_number}</TableCell>
                         <TableCell>{format(new Date(wo.created_at), 'dd MMM yyyy')}</TableCell>
                         <TableCell className="font-medium">{wo.product?.name}</TableCell>
                         <TableCell>{wo.target_quantity}</TableCell>
                         <TableCell>{getStatusBadge(wo.status)}</TableCell>
                         <TableCell>{wo.warehouse?.name}</TableCell>
                         <TableCell>
                           <Button variant="outline" size="sm" onClick={() => { setSelectedWO(wo); setShowDetailDialog(true); }}>
                             Buka Card
                           </Button>
                         </TableCell>
                      </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </CardContent>
           </Card>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
               <DialogTitle>Buat Work Order Baru</DialogTitle>
               <DialogDescription>
                  Sistem akan menjabarkan (explode) BOM dari produk target dan menghitung kitting bahan baku termasuk perhitungan Yield Factor.
               </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                 <Label>Pilih Produk (Tujuan Masak)</Label>
                 <Select value={formData.product_id} onValueChange={(v) => setFormData({...formData, product_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Pilih Menu/Paket..." /></SelectTrigger>
                    <SelectContent>
                      {productsWithBom.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                 </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Target Produksi (Qty)</Label>
                   <Input type="number" min="1" value={formData.target_quantity} onChange={(e) => setFormData({...formData, target_quantity: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                   <Label>Lokasi Produksi (Gudang)</Label>
                   <Select value={formData.warehouse_id} onValueChange={(v) => setFormData({...formData, warehouse_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Dapur / Gudang..." /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                   </Select>
                 </div>
              </div>
              <div className="space-y-2">
                 <Label>Notes</Label>
                 <Input value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Instruksi masak khusus..." />
              </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Batal</Button>
               <Button onClick={handleCreateWO} disabled={isSubmitting}>{isSubmitting ? 'Loading...' : 'Generate Kitting List'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View / Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
             <DialogHeader>
               <DialogTitle className="flex justify-between items-center pr-8">
                 <span>Job Card: {selectedWO?.wo_number}</span>
                 {getStatusBadge(selectedWO?.status)}
               </DialogTitle>
             </DialogHeader>
             
             {selectedWO && (
               <div className="space-y-6">
                 {/* Summary Header */}
                 <div className="grid grid-cols-3 gap-2 border p-3 rounded bg-muted/20">
                    <div>
                      <p className="text-xs text-muted-foreground">Target Produk</p>
                      <p className="font-medium text-lg">{selectedWO.product?.name}</p>
                      <p className="text-xs">Qty: {selectedWO.target_quantity}</p>
                    </div>
                    <div>
                       <p className="text-xs text-muted-foreground">Lokasi WIP</p>
                       <p className="font-medium">{selectedWO.warehouse?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">PIC / Chef</p>
                      <p className="font-medium">-</p>
                    </div>
                 </div>

                 {/* Kitting List / Bahan Baku */}
                 <div>
                    <h3 className="font-semibold mb-2">Pick List & Kitting Bahan Baku</h3>
                    <p className="text-sm text-muted-foreground mb-3">Tandai bahan baku yang sedang dipersiapkan/dicuci. Nilai kuantitas sudah memperhitungkan <strong className="text-orange-600">penyusutan (Yield Factor)</strong>.</p>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Pick</TableHead>
                          <TableHead>Nama Bahan Baku</TableHead>
                          <TableHead className="text-right">Qty Dibutuhkan</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedWO.items?.map((item: any) => (
                           <TableRow key={item.id}>
                             <TableCell>
                               <Checkbox 
                                 checked={item.status === 'picked'} 
                                 onCheckedChange={(c) => updatePlayItemStatus(item.id, !!c)}
                                 disabled={selectedWO.status === 'completed' || selectedWO.status === 'cancelled'}
                               />
                             </TableCell>
                             <TableCell className="font-medium">{item.product?.name}</TableCell>
                             <TableCell className="text-right">{Number(item.planned_quantity).toFixed(2)} {item.product?.base_unit || 'Unit'}</TableCell>
                             <TableCell>
                                {item.status === 'picked' ? <Badge variant="secondary" className="bg-green-100 text-green-800">Siap</Badge> : <Badge variant="outline">Belum Siap</Badge>}
                             </TableCell>
                           </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                 </div>

                 {/* Actions */}
                 <div className="flex gap-2 justify-end pt-4 border-t">
                    {selectedWO.status === 'planned' && (
                       <Button onClick={() => updateWOStatus(selectedWO.id, 'kitting')}><ArrowRightCircle className="w-4 h-4 mr-2" /> Mulai Kitting</Button>
                    )}
                    {(selectedWO.status === 'planned' || selectedWO.status === 'kitting') && (
                       <Button onClick={() => updateWOStatus(selectedWO.id, 'in_progress')} className="bg-blue-600 hover:bg-blue-700"><PlayCircle className="w-4 h-4 mr-2" /> Masuk Pengolahan (WIP)</Button>
                    )}
                    {selectedWO.status === 'in_progress' && (
                       <Button onClick={() => updateWOStatus(selectedWO.id, 'completed')} className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="w-4 h-4 mr-2" /> Produksi Selesai (Mutasi Stok)</Button>
                    )}
                    {selectedWO.status !== 'completed' && selectedWO.status !== 'cancelled' && (
                       <Button variant="ghost" className="text-red-600" onClick={() => updateWOStatus(selectedWO.id, 'cancelled')}>Batalkan WO</Button>
                    )}
                 </div>
               </div>
             )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
