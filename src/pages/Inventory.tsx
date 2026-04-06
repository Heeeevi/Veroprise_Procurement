import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOutlet } from '@/hooks/useOutlet';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, AlertTriangle, Package, ArrowUpDown, Truck, FileText, Calendar, Trash2, AlertCircle, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';

interface InventoryItemWithStock {
  id: string;
  name: string;
  unit: string;
  min_stock: number;
  current_stock: number;
  cost_per_unit: number;
  is_active?: boolean;
}

interface DeleteCheckResult {
  hasTransactions: boolean;
  hasPurchaseOrders: boolean;
  hasRecipes: boolean;
  transactionCount: number;
  poCount: number;
  recipeCount: number;
}

export default function Inventory() {
  const { user, isOwner, isManager } = useAuth();
  const { selectedOutlet } = useOutlet();
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItemWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItemWithStock | null>(null);
  const [deleteCheckResult, setDeleteCheckResult] = useState<DeleteCheckResult | null>(null);
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

  // Edit item form
  const [editItem, setEditItem] = useState({
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
    // Batch module is not available in the current procurement schema.
    setBatches([]);
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedOutlet?.id]);

  useEffect(() => {
    if (!selectedOutlet) {
      return;
    }

    const channel = supabase
      .channel(`inventory-live-${selectedOutlet.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory', filter: `outlet_id=eq.${selectedOutlet.id}` },
        () => {
          fetchInventory();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'warehouse_inventory' },
        () => {
          fetchInventory();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchInventory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedOutlet?.id]);

  const fetchInventory = async () => {
    try {
      if (!selectedOutlet) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Outlet-scoped inventory: each branch sees only its own stock.
      const { data } = await (supabase as any)
        .from('inventory')
        .select('id, product_id, quantity, min_quantity, unit, is_active, product:products(name, cost, is_active, is_service)')
        .eq('outlet_id', selectedOutlet.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const inventoryItems = (data || [])
        .filter((row: any) => row.product && row.product.is_active && !row.product.is_service)
        .map((row: any) => ({
          id: row.product_id,
          name: row.product.name,
          unit: row.unit || 'pcs',
          min_stock: row.min_quantity || 0,
          current_stock: row.quantity || 0,
          cost_per_unit: row.product.cost || 0,
          is_active: row.is_active,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      // Fallback for central-warehouse context: show warehouse stock if outlet inventory has not been seeded yet.
      if (inventoryItems.length === 0 && selectedOutlet.name.toLowerCase().includes('warehouse')) {
        const { data: centralWarehouse } = await (supabase as any)
          .from('warehouses')
          .select('id')
          .eq('is_active', true)
          .ilike('name', `%${selectedOutlet.name}%`)
          .maybeSingle();

        if (centralWarehouse?.id) {
          const { data: warehouseRows } = await (supabase as any)
            .from('warehouse_inventory')
            .select('product_id, quantity, min_stock, cost_per_unit, product:products(name, is_active, is_service)')
            .eq('warehouse_id', centralWarehouse.id);

          const fallbackItems = (warehouseRows || [])
            .filter((row: any) => row.product && row.product.is_active && !row.product.is_service)
            .map((row: any) => ({
              id: row.product_id,
              name: row.product.name,
              unit: 'pcs',
              min_stock: row.min_stock || 0,
              current_stock: row.quantity || 0,
              cost_per_unit: row.cost_per_unit || 0,
              is_active: true,
            }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name));

          if (fallbackItems.length > 0) {
            setItems(fallbackItems as InventoryItemWithStock[]);
            return;
          }
        }
      }

      setItems(inventoryItems as InventoryItemWithStock[]);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDeleteDependencies = async (itemId: string): Promise<DeleteCheckResult> => {
    try {
      // Check inventory transactions
      const { data: transactions } = await (supabase as any)
        .from('inventory_transactions')
        .select('id', { count: 'exact' })
        .eq('product_id', itemId);

      // Check purchase order items
      const { data: poItems } = await (supabase as any)
        .from('purchase_order_items')
        .select('id', { count: 'exact' })
        .eq('product_id', itemId);

      // Check transaction items (sales)
      const { data: txItems } = await (supabase as any)
        .from('transaction_items')
        .select('id', { count: 'exact' })
        .eq('product_id', itemId);

      return {
        hasTransactions: (transactions?.length || 0) > 0,
        hasPurchaseOrders: (poItems?.length || 0) > 0,
        hasRecipes: (txItems?.length || 0) > 0, // Using transaction_items instead of recipes
        transactionCount: transactions?.length || 0,
        poCount: poItems?.length || 0,
        recipeCount: txItems?.length || 0,
      };
    } catch (error) {
      console.error('Error checking dependencies:', error);
      return {
        hasTransactions: false,
        hasPurchaseOrders: false,
        hasRecipes: false,
        transactionCount: 0,
        poCount: 0,
        recipeCount: 0,
      };
    }
  };

  const handleDeleteClick = async (item: InventoryItemWithStock) => {
    setSelectedItem(item);
    const checkResult = await checkDeleteDependencies(item.id);
    setDeleteCheckResult(checkResult);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedItem) return;

    try {
      const hasAnyDependency = 
        deleteCheckResult?.hasTransactions || 
        deleteCheckResult?.hasPurchaseOrders || 
        deleteCheckResult?.hasRecipes;

      if (hasAnyDependency) {
        // SOFT DELETE - Mark as inactive
        const { error } = await (supabase as any)
          .from('products')
          .update({ is_active: false })
          .eq('id', selectedItem.id);

        if (error) throw error;

        toast({
          title: 'Item di-nonaktifkan',
          description: `${selectedItem.name} telah dinonaktifkan. Data historis tetap tersimpan untuk integritas laporan keuangan.`,
        });
      } else {
        // HARD DELETE - No dependencies
        const { error } = await (supabase as any)
          .from('products')
          .delete()
          .eq('id', selectedItem.id);

        if (error) throw error;

        toast({
          title: 'Item dihapus',
          description: `${selectedItem.name} berhasil dihapus dari sistem.`,
        });
      }

      setShowDeleteDialog(false);
      setSelectedItem(null);
      setDeleteCheckResult(null);
      fetchInventory();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menghapus item',
        variant: 'destructive',
      });
    }
  };

  const handleEditClick = (item: InventoryItemWithStock) => {
    setSelectedItem(item);
    setEditItem({
      name: item.name,
      unit: item.unit,
      min_stock: item.min_stock.toString(),
      cost_per_unit: item.cost_per_unit.toString(),
    });
    setShowEditDialog(true);
  };

  const handleEditItem = async () => {
    if (!selectedItem) return;
    if (!selectedOutlet) return;
    
    try {
      const { error: productError } = await (supabase as any)
        .from('products')
        .update({
          name: editItem.name,
          cost: parseFloat(editItem.cost_per_unit) || 0,
        })
        .eq('id', selectedItem.id);

      if (productError) throw productError;

      const { error: inventoryError } = await (supabase as any)
        .from('inventory')
        .update({
          min_quantity: parseFloat(editItem.min_stock) || 0,
          unit: editItem.unit || 'pcs',
        })
        .eq('outlet_id', selectedOutlet.id)
        .eq('product_id', selectedItem.id);

      if (inventoryError) throw inventoryError;

      toast({ title: 'Berhasil', description: 'Item berhasil diupdate' });
      setShowEditDialog(false);
      setSelectedItem(null);
      setEditItem({ name: '', unit: '', min_stock: '', cost_per_unit: '' });
      fetchInventory();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddItem = async () => {
    if (!selectedOutlet) {
      toast({ title: 'Error', description: 'Pilih outlet terlebih dahulu', variant: 'destructive' });
      return;
    }
    
    try {
      const { data: newProduct, error: productError } = await (supabase as any)
        .from('products')
        .insert({
          outlet_id: selectedOutlet.id,
          name: newItem.name,
          price: 0,
          min_stock: parseFloat(newItem.min_stock) || 0,
          cost: parseFloat(newItem.cost_per_unit) || 0,
          stock_quantity: 0,
          is_service: false,
        })
        .select('id')
        .single();

      if (productError) throw productError;

      const { error: inventoryError } = await (supabase as any)
        .from('inventory')
        .insert({
          outlet_id: selectedOutlet.id,
          product_id: newProduct.id,
          quantity: 0,
          min_quantity: parseFloat(newItem.min_stock) || 0,
          unit: newItem.unit || 'pcs',
          is_active: true,
        });

      if (inventoryError) throw inventoryError;

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

      if (newStock < 0) {
        toast({ title: 'Error', description: 'Stok tidak boleh minus', variant: 'destructive' });
        return;
      }

      // Update stock
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ quantity: newStock })
        .eq('outlet_id', selectedOutlet.id)
        .eq('product_id', selectedItem.id);

      if (updateError) throw updateError;

      // Log transaction
      const { error: logError } = await supabase.from('inventory_transactions').insert({
        outlet_id: selectedOutlet.id,
        product_id: selectedItem.id,
        performed_by: user.id,
        transaction_type: 'adjustment',
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
            <div className="overflow-x-auto">
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
                      {(isOwner || isManager) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(item)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedItemForBatches(item)}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Batches
                      </Button>
                      {(isOwner || isManager) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(item)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Hapus
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
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
                placeholder="Pomade, Shampoo, dll"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Input
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  placeholder="pcs, bottle, kg"
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
              <Label>Harga per Unit / HPP (Rp)</Label>
              <Input
                type="number"
                value={newItem.cost_per_unit}
                onChange={(e) => setNewItem({ ...newItem, cost_per_unit: e.target.value })}
                placeholder="150000"
              />
              <p className="text-xs text-muted-foreground">Harga Pokok Penjualan untuk hitung profit</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
            <Button onClick={handleAddItem}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Edit Item - {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Item</Label>
              <Input
                value={editItem.name}
                onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Input
                  value={editItem.unit}
                  onChange={(e) => setEditItem({ ...editItem, unit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Min. Stok</Label>
                <Input
                  type="number"
                  value={editItem.min_stock}
                  onChange={(e) => setEditItem({ ...editItem, min_stock: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Harga per Unit / HPP (Rp)</Label>
              <Input
                type="number"
                value={editItem.cost_per_unit}
                onChange={(e) => setEditItem({ ...editItem, cost_per_unit: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Harga Pokok Penjualan untuk hitung profit</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Batal</Button>
            <Button onClick={handleEditItem}>Simpan Perubahan</Button>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Konfirmasi Hapus Item
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus item berikut?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Item Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold text-lg">{selectedItem?.name}</p>
              <p className="text-sm text-muted-foreground">
                Stok: {selectedItem?.current_stock} {selectedItem?.unit}
              </p>
            </div>

            {/* Dependency Warning */}
            {deleteCheckResult && (
              <div className="space-y-2">
                {(deleteCheckResult.hasTransactions || deleteCheckResult.hasPurchaseOrders || deleteCheckResult.hasRecipes) ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-semibold mb-2">⚠️ Item ini memiliki data historis:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {deleteCheckResult.hasTransactions && (
                          <li>{deleteCheckResult.transactionCount} transaksi inventory</li>
                        )}
                        {deleteCheckResult.hasPurchaseOrders && (
                          <li>{deleteCheckResult.poCount} purchase order</li>
                        )}
                        {deleteCheckResult.hasRecipes && (
                          <li>{deleteCheckResult.recipeCount} resep produk (BOM)</li>
                        )}
                      </ul>
                      <p className="mt-3 font-semibold text-amber-600">
                        Item akan di-<strong>nonaktifkan</strong> (soft delete) untuk menjaga integritas laporan keuangan.
                      </p>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertDescription>
                      ✓ Item ini tidak memiliki data historis dan dapat dihapus sepenuhnya.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Impact Warning */}
            <Alert>
              <AlertDescription className="text-sm">
                <p className="font-semibold mb-1">📊 Dampak terhadap Sistem:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>Laporan Keuangan:</strong> Data historis tetap tersimpan</li>
                  <li><strong>Purchase Order:</strong> PO lama tetap valid</li>
                  <li><strong>Cashflow:</strong> Tidak terpengaruh (data historis utuh)</li>
                  <li><strong>Form Input:</strong> Item tidak akan muncul di dropdown baru</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedItem(null);
                setDeleteCheckResult(null);
              }}
            >
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {deleteCheckResult?.hasTransactions || deleteCheckResult?.hasPurchaseOrders || deleteCheckResult?.hasRecipes
                ? 'Nonaktifkan Item'
                : 'Hapus Permanen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
