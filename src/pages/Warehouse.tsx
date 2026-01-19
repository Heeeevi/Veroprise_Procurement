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
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Warehouse as WarehouseIcon, ArrowRight, Package, Truck, Store, RefreshCw, ClipboardList } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WarehouseItem {
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    min_stock: number;
    cost_per_unit: number;
}

interface Warehouse {
    id: string;
    code: string;
    name: string;
    warehouse_type: 'central' | 'regional';
    is_active: boolean;
}

export default function WarehousePage() {
    const { isOwner, isManager } = useAuth();
    const { selectedOutlet } = useOutlet();
    const { toast } = useToast();

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
    const [inventory, setInventory] = useState<WarehouseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Dialogs
    const [showReceiveDialog, setShowReceiveDialog] = useState(false);
    const [showTransferDialog, setShowTransferDialog] = useState(false);

    // Receive from supplier form
    const [receiveProduct, setReceiveProduct] = useState('');
    const [receiveQuantity, setReceiveQuantity] = useState('');
    const [receiveCost, setReceiveCost] = useState('');
    const [receiveSupplier, setReceiveSupplier] = useState('');

    const [transferProduct, setTransferProduct] = useState('');
    const [transferQuantity, setTransferQuantity] = useState('');
    const [transferDestination, setTransferDestination] = useState('');

    // Stock Opname
    const [showOpnameDialog, setShowOpnameDialog] = useState(false);
    const [opnameItems, setOpnameItems] = useState<any[]>([]);
    const [opnameNote, setOpnameNote] = useState('');

    // Products and outlets for dropdowns
    const [products, setProducts] = useState<any[]>([]);
    const [outlets, setOutlets] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedWarehouse) {
            fetchWarehouseInventory(selectedWarehouse.id);
        }
    }, [selectedWarehouse]);

    const fetchData = async () => {
        try {
            // Fetch warehouses
            const { data: warehouseData } = await (supabase as any)
                .from('warehouses')
                .select('*')
                .eq('is_active', true)
                .order('name');

            setWarehouses(warehouseData || []);
            if (warehouseData && warehouseData.length > 0) {
                setSelectedWarehouse(warehouseData[0]);
            }

            // Fetch products
            const { data: productData } = await supabase
                .from('products')
                .select('id, name, price, cost')
                .eq('is_active', true)
                .order('name');
            setProducts(productData || []);

            // Fetch outlets
            const { data: outletData } = await supabase
                .from('outlets')
                .select('id, name')
                .eq('status', 'active')
                .order('name');
            setOutlets(outletData || []);

            // Fetch suppliers
            const { data: supplierData } = await (supabase as any)
                .from('suppliers')
                .select('id, name')
                .eq('is_active', true)
                .order('name');
            setSuppliers(supplierData || []);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWarehouseInventory = async (warehouseId: string) => {
        try {
            const { data } = await (supabase as any)
                .from('warehouse_inventory')
                .select('*, product:products(name)')
                .eq('warehouse_id', warehouseId)
                .order('created_at', { ascending: false });

            const inventoryItems = (data || []).map((item: any) => ({
                id: item.id,
                product_id: item.product_id,
                product_name: item.product?.name || 'Unknown',
                quantity: item.quantity,
                min_stock: item.min_stock,
                cost_per_unit: item.cost_per_unit,
            }));

            setInventory(inventoryItems);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    };

    const handleReceiveFromSupplier = async () => {
        if (!selectedWarehouse || !receiveProduct || !receiveQuantity) {
            toast({ title: 'Error', description: 'Lengkapi semua data', variant: 'destructive' });
            return;
        }

        try {
            const qty = parseFloat(receiveQuantity);
            const cost = parseFloat(receiveCost) || 0;

            // Check if product already exists in warehouse
            const { data: existing } = await (supabase as any)
                .from('warehouse_inventory')
                .select('id, quantity')
                .eq('warehouse_id', selectedWarehouse.id)
                .eq('product_id', receiveProduct)
                .single();

            if (existing) {
                // Update existing
                await (supabase as any)
                    .from('warehouse_inventory')
                    .update({
                        quantity: existing.quantity + qty,
                        cost_per_unit: cost || undefined,
                    })
                    .eq('id', existing.id);
            } else {
                // Insert new
                await (supabase as any)
                    .from('warehouse_inventory')
                    .insert({
                        warehouse_id: selectedWarehouse.id,
                        product_id: receiveProduct,
                        quantity: qty,
                        min_stock: 0,
                        cost_per_unit: cost,
                    });
            }

            toast({ title: 'Berhasil', description: 'Barang dari supplier telah diterima' });
            setShowReceiveDialog(false);
            setReceiveProduct('');
            setReceiveQuantity('');
            setReceiveCost('');
            setReceiveSupplier('');
            fetchWarehouseInventory(selectedWarehouse.id);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const handleTransferToStore = async () => {
        if (!selectedWarehouse || !transferProduct || !transferQuantity || !transferDestination) {
            toast({ title: 'Error', description: 'Lengkapi semua data', variant: 'destructive' });
            return;
        }

        try {
            const qty = parseFloat(transferQuantity);

            // Get current warehouse stock
            const { data: warehouseStock } = await (supabase as any)
                .from('warehouse_inventory')
                .select('id, quantity')
                .eq('warehouse_id', selectedWarehouse.id)
                .eq('product_id', transferProduct)
                .single();

            if (!warehouseStock || warehouseStock.quantity < qty) {
                toast({ title: 'Error', description: 'Stok gudang tidak mencukupi', variant: 'destructive' });
                return;
            }

            // Decrease warehouse stock
            await (supabase as any)
                .from('warehouse_inventory')
                .update({ quantity: warehouseStock.quantity - qty })
                .eq('id', warehouseStock.id);

            // Increase store product stock
            const { data: storeProduct } = await supabase
                .from('products')
                .select('id, stock_quantity')
                .eq('id', transferProduct)
                .eq('outlet_id', transferDestination)
                .single();

            if (storeProduct) {
                await supabase
                    .from('products')
                    .update({ stock_quantity: (storeProduct.stock_quantity || 0) + qty })
                    .eq('id', storeProduct.id);
            } else {
                // Product doesn't exist in store, need to create or find
                const { data: productInfo } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', transferProduct)
                    .single();

                if (productInfo) {
                    // Create product in new outlet or just update stock
                    await (supabase as any)
                        .from('products')
                        .update({ stock_quantity: (productInfo.stock_quantity || 0) + qty })
                        .eq('id', transferProduct);
                }
            }

            // Log the transfer
            await (supabase as any)
                .from('stock_transfers')
                .insert({
                    source_warehouse_id: selectedWarehouse.id,
                    destination_outlet_id: transferDestination,
                    status: 'received',
                    transfer_date: new Date().toISOString().split('T')[0],
                    notes: `Transfer ${qty} units`,
                });

            toast({ title: 'Berhasil', description: 'Stok berhasil ditransfer ke toko' });
            setShowTransferDialog(false);
            setTransferProduct('');
            setTransferQuantity('');
            setTransferDestination('');
            fetchWarehouseInventory(selectedWarehouse.id);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const handleOpenOpname = () => {
        if (!selectedWarehouse) return;
        // Initialize opname items with current inventory
        const items = inventory.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            system_qty: item.quantity,
            actual_qty: item.quantity, // Default to system qty
            notes: ''
        }));
        setOpnameItems(items);
        setOpnameNote('');
        setShowOpnameDialog(true);
    };

    const handleOpnameChange = (index: number, field: string, value: any) => {
        const newItems = [...opnameItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setOpnameItems(newItems);
    };

    const handleSaveOpname = async () => {
        if (!selectedWarehouse) return;

        try {
            // 1. Create Opname Record
            const { data: opnameRef, error: opnameError } = await (supabase as any)
                .from('stock_opnames')
                .insert({
                    warehouse_id: selectedWarehouse.id,
                    opname_date: new Date().toISOString().split('T')[0],
                    status: 'completed',
                    items: opnameItems,
                    notes: opnameNote
                })
                .select()
                .single();

            if (opnameError) throw opnameError;

            // 2. Adjust Stock
            for (const item of opnameItems) {
                if (parseFloat(item.actual_qty) !== item.system_qty) {
                    await (supabase as any)
                        .from('warehouse_inventory')
                        .update({ quantity: parseFloat(item.actual_qty) })
                        .eq('warehouse_id', selectedWarehouse.id)
                        .eq('product_id', item.product_id);
                }
            }

            toast({ title: 'Berhasil', description: 'Stock Opname berhasil disimpan dan stok disesuaikan' });
            setShowOpnameDialog(false);
            fetchWarehouseInventory(selectedWarehouse.id);
        } catch (error: any) {
            console.error('Error saving opname:', error);
            toast({ title: 'Error', description: 'Gagal menimpan Stock Opname', variant: 'destructive' });
        }
    };

    const filteredInventory = inventory.filter(item =>
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const lowStockItems = inventory.filter(item => item.quantity <= item.min_stock);

    return (
        <MainLayout>
            <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
                            <WarehouseIcon className="h-6 w-6" />
                            Manajemen Gudang
                        </h1>
                        <p className="text-muted-foreground">Kelola stok gudang pusat dan transfer ke toko</p>
                    </div>
                    {(isOwner || isManager) && (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowReceiveDialog(true)}>
                                <Truck className="h-4 w-4 mr-2" />
                                Terima dari Supplier
                            </Button>
                            <Button onClick={() => setShowTransferDialog(true)}>
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Transfer ke Toko
                            </Button>
                            <Button variant="secondary" onClick={handleOpenOpname}>
                                <ClipboardList className="h-4 w-4 mr-2" />
                                Stock Opname
                            </Button>
                        </div>
                    )}
                </div>

                {/* Warehouse Selector */}
                {warehouses.length > 0 && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <Label className="whitespace-nowrap">Pilih Gudang:</Label>
                                <Select
                                    value={selectedWarehouse?.id || ''}
                                    onValueChange={(v) => setSelectedWarehouse(warehouses.find(w => w.id === v) || null)}
                                >
                                    <SelectTrigger className="w-64">
                                        <SelectValue placeholder="Pilih gudang" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses.map(w => (
                                            <SelectItem key={w.id} value={w.id}>
                                                {w.name} ({w.warehouse_type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button variant="ghost" size="icon" onClick={() => selectedWarehouse && fetchWarehouseInventory(selectedWarehouse.id)}>
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Low Stock Alert */}
                {lowStockItems.length > 0 && (
                    <Card className="border-warning bg-warning/5">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Package className="h-5 w-5 text-warning" />
                                <div>
                                    <p className="font-medium">Stok Rendah di Gudang!</p>
                                    <p className="text-sm text-muted-foreground">
                                        {lowStockItems.length} item perlu restock: {lowStockItems.map(i => i.product_name).join(', ')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Inventory Table */}
                <Card className="card-warm">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <CardTitle className="font-display flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Stok Gudang {selectedWarehouse?.name ? `- ${selectedWarehouse.name}` : ''}
                            </CardTitle>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari produk..."
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
                                    <TableHead>Produk</TableHead>
                                    <TableHead>Stok Saat Ini</TableHead>
                                    <TableHead>Min. Stok</TableHead>
                                    <TableHead>Harga Beli/Unit</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInventory.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            {loading ? 'Loading...' : 'Belum ada stok di gudang ini'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredInventory.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.product_name}</TableCell>
                                            <TableCell>
                                                <span className={item.quantity <= item.min_stock ? 'text-destructive font-semibold' : ''}>
                                                    {item.quantity}
                                                </span>
                                            </TableCell>
                                            <TableCell>{item.min_stock}</TableCell>
                                            <TableCell>{formatCurrency(item.cost_per_unit)}</TableCell>
                                            <TableCell>
                                                {item.quantity <= item.min_stock ? (
                                                    <Badge variant="destructive">Low Stock</Badge>
                                                ) : (
                                                    <Badge variant="secondary">OK</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Receive from Supplier Dialog */}
            <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-display">Terima Barang dari Supplier</DialogTitle>
                        <DialogDescription>
                            Tambah stok gudang dari pengiriman supplier
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Supplier</Label>
                            <Select value={receiveSupplier} onValueChange={setReceiveSupplier}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Produk</Label>
                            <Select value={receiveProduct} onValueChange={setReceiveProduct}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih produk" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Jumlah</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={receiveQuantity}
                                    onChange={(e) => setReceiveQuantity(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Harga Beli/Unit (Rp)</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={receiveCost}
                                    onChange={(e) => setReceiveCost(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>Batal</Button>
                        <Button onClick={handleReceiveFromSupplier}>Terima Barang</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Transfer to Store Dialog */}
            <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-display">Transfer Stok ke Toko</DialogTitle>
                        <DialogDescription>
                            Kirim stok dari gudang {selectedWarehouse?.name} ke outlet toko
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Produk</Label>
                            <Select value={transferProduct} onValueChange={setTransferProduct}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih produk" />
                                </SelectTrigger>
                                <SelectContent>
                                    {inventory.map(item => (
                                        <SelectItem key={item.product_id} value={item.product_id}>
                                            {item.product_name} (Stok: {item.quantity})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Jumlah Transfer</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={transferQuantity}
                                onChange={(e) => setTransferQuantity(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Toko Tujuan</Label>
                            <Select value={transferDestination} onValueChange={setTransferDestination}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih toko" />
                                </SelectTrigger>
                                <SelectContent>
                                    {outlets.map(o => (
                                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Batal</Button>
                        <Button onClick={handleTransferToStore}>
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Transfer Stok
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Stock Opname Dialog */}
            <Dialog open={showOpnameDialog} onOpenChange={setShowOpnameDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-display">Stock Opname Gudang</DialogTitle>
                        <DialogDescription>
                            Sesuaikan stok fisik dengan sistem. Stok di sistem akan diperbarui otomatis.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex justify-between items-center text-sm bg-muted p-2 rounded">
                            <span>Gudang: <strong>{selectedWarehouse?.name}</strong></span>
                            <span>Tanggal: <strong>{new Date().toLocaleDateString('id-ID')}</strong></span>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produk</TableHead>
                                        <TableHead className="w-24">Stok Sistem</TableHead>
                                        <TableHead className="w-32">Stok Fisik</TableHead>
                                        <TableHead className="w-24">Selisih</TableHead>
                                        <TableHead>Keterangan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {opnameItems.map((item, index) => {
                                        const diff = parseFloat(item.actual_qty || 0) - item.system_qty;
                                        return (
                                            <TableRow key={item.product_id}>
                                                <TableCell className="font-medium">{item.product_name}</TableCell>
                                                <TableCell>{item.system_qty}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={item.actual_qty}
                                                        onChange={(e) => handleOpnameChange(index, 'actual_qty', e.target.value)}
                                                        className="h-8"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <span className={diff !== 0 ? (diff < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold') : 'text-gray-400'}>
                                                        {diff > 0 ? `+${diff}` : diff}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.notes}
                                                        onChange={(e) => handleOpnameChange(index, 'notes', e.target.value)}
                                                        placeholder="Alasan selisih..."
                                                        className="h-8"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="space-y-2">
                            <Label>Catatan Umum Opname</Label>
                            <Input value={opnameNote} onChange={(e) => setOpnameNote(e.target.value)} placeholder="Catatan tambahan..." />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowOpnameDialog(false)}>Batal</Button>
                        <Button onClick={handleSaveOpname}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Simpan & Update Stok
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
