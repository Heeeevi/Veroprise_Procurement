import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOutlet } from '@/hooks/useOutlet';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, AlertTriangle, Package, ArrowUpDown, Truck, FileText, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

interface InventoryItemWithStock {
  id: string;
  name: string;
  unit: string;
  min_stock: number;
  current_stock: number;
  cost_per_unit: number;
}

export default function Inventory() {
  const { user, isOwner, isManager } = useAuth();
  const { selectedOutlet } = useOutlet();
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItemWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItemWithStock | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');
  const [adjustNotes, setAdjustNotes] = useState('');

  // New item form
  const [newItem, setNewItem] = useState({
    name: '',
    unit: '',
    min_stock: '',
    cost_per_unit: '',
  });

  // Batch viewing state
  const [selectedItemForBatches, setSelectedItemForBatches] = useState<InventoryItemWithStock | null>(null);
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    if (selectedItemForBatches) {
      fetchBatches(selectedItemForBatches.id);
    }
  }, [selectedItemForBatches]);

  const fetchBatches = async (itemId: string) => {
    const { data } = await supabase
      .from('inventory_batches')
      .select('*')
      .eq('inventory_item_id', itemId)
      .gt('current_quantity', 0) // Only show available batches
      .order('expiration_date', { ascending: true });
    setBatches(data || []);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const { data } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');

      setItems((data || []) as InventoryItemWithStock[]);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      const { error } = await supabase.from('inventory_items').insert({
        name: newItem.name,
        unit: newItem.unit,
        min_stock: parseFloat(newItem.min_stock) || 0,
        cost_per_unit: parseFloat(newItem.cost_per_unit) || 0,
      });

      if (error) throw error;

      toast({ title: 'Berhasil', description: 'Item berhasil ditambahkan' });
      setShowAddDialog(false);
      setNewItem({ name: '', unit: '', min_stock: '', cost_per_unit: '' });
      fetchInventory();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedItem || !user || !selectedOutlet) return;

    const qty = parseFloat(adjustQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: 'Error', description: 'Jumlah tidak valid', variant: 'destructive' });
      return;
    }

    try {
      const finalQty = adjustType === 'add' ? qty : -qty;
      const newStock = selectedItem.current_stock + finalQty;

      // Update stock
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ current_stock: newStock })
        .eq('id', selectedItem.id);

      if (updateError) throw updateError;

      // Log transaction
      const { error: logError } = await supabase.from('inventory_transactions').insert({
        outlet_id: selectedOutlet.id,
        inventory_item_id: selectedItem.id,
        user_id: user.id,
        type: adjustType === 'add' ? 'purchase' : 'usage',
        quantity: finalQty,
        notes: adjustNotes,
      });

      if (logError) throw logError;

      toast({ title: 'Berhasil', description: 'Stok berhasil diupdate' });
      setShowAdjustDialog(false);
      setAdjustQuantity('');
      setAdjustNotes('');
      fetchInventory();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = items.filter((item) => item.current_stock <= item.min_stock);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Inventory</h1>
            <p className="text-muted-foreground">Kelola stok bahan baku dan supplies</p>
          </div>
          {(isOwner || isManager) && (
            <div className="flex gap-2">
              <Link to="/inventory/vendors">
                <Button variant="outline">
                  <Truck className="h-4 w-4 mr-2" />
                  Manage Vendors
                </Button>
              </Link>
              <Link to="/inventory/purchase-orders">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Purchase Orders
                </Button>
              </Link>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Item
              </Button>
            </div>
          )}
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="border-warning bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium">Stok Rendah!</p>
                  <p className="text-sm text-muted-foreground">
                    {lowStockItems.length} item perlu restock: {lowStockItems.map((i) => i.name).join(', ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="card-warm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="font-display flex items-center gap-2">
                <Package className="h-5 w-5" />
                Daftar Inventory
              </CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Item</TableHead>
                  <TableHead>Stok Saat Ini</TableHead>
                  <TableHead>Min. Stok</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead>Harga/Unit</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <span className={item.current_stock <= item.min_stock ? 'text-destructive font-semibold' : ''}>
                        {item.current_stock}
                      </span>
                      {item.current_stock <= item.min_stock && (
                        <Badge variant="destructive" className="ml-2">Low</Badge>
                      )}
                    </TableCell>
                    <TableCell>{item.min_stock}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{formatCurrency(item.cost_per_unit)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item);
                          setShowAdjustDialog(true);
                        }}
                      >
                        <ArrowUpDown className="h-4 w-4 mr-1" />
                        Adjust
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedItemForBatches(item)}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Batches
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Tambah Item Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Item</Label>
              <Input
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="Biji Kopi Arabica"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Input
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  placeholder="kg"
                />
              </div>
              <div className="space-y-2">
                <Label>Min. Stok</Label>
                <Input
                  type="number"
                  value={newItem.min_stock}
                  onChange={(e) => setNewItem({ ...newItem, min_stock: e.target.value })}
                  placeholder="5"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Harga per Unit (Rp)</Label>
              <Input
                type="number"
                value={newItem.cost_per_unit}
                onChange={(e) => setNewItem({ ...newItem, cost_per_unit: e.target.value })}
                placeholder="150000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
            <Button onClick={handleAddItem}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Adjust Stok - {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Stok saat ini: <strong>{selectedItem?.current_stock} {selectedItem?.unit}</strong>
            </p>
            <div className="flex gap-2">
              <Button
                variant={adjustType === 'add' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setAdjustType('add')}
              >
                + Tambah Stok
              </Button>
              <Button
                variant={adjustType === 'remove' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setAdjustType('remove')}
              >
                - Kurangi Stok
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Jumlah ({selectedItem?.unit})</Label>
              <Input
                type="number"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Catatan (opsional)</Label>
              <Input
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Pembelian dari supplier"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>Batal</Button>
            <Button onClick={handleAdjustStock}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Batch Details Dialog */}
      <Dialog open={!!selectedItemForBatches} onOpenChange={(open) => !open && setSelectedItemForBatches(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Detail Batch - {selectedItemForBatches?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Code</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Received Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Tidak ada data batch</TableCell></TableRow>
                ) : (
                  batches.map(batch => {
                    const isExpired = batch.expiration_date && new Date(batch.expiration_date) < new Date();
                    const isNearExpiry = batch.expiration_date && new Date(batch.expiration_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="font-mono text-xs">{batch.sku_batch || '-'}</TableCell>
                        <TableCell>{batch.current_quantity}</TableCell>
                        <TableCell>{batch.received_date ? new Date(batch.received_date).toLocaleDateString('id-ID') : '-'}</TableCell>
                        <TableCell className={isExpired ? 'text-red-600 font-bold' : isNearExpiry ? 'text-amber-600 font-semibold' : ''}>
                          {batch.expiration_date ? new Date(batch.expiration_date).toLocaleDateString('id-ID') : '-'}
                        </TableCell>
                        <TableCell>
                          {isExpired ? <Badge variant="destructive">Expired</Badge> :
                            isNearExpiry ? <Badge variant="secondary" className="bg-amber-100 text-amber-800">Near Expiry</Badge> :
                              <Badge variant="outline">Good</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
