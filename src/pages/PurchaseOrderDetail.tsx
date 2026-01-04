import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Send, CheckCircle, Trash2, Plus, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface POItem {
    id: string;
    inventory_item_id: string;
    quantity: number;
    unit_cost: number;
    subtotal: number;
    inventory_item: {
        name: string;
        unit: string;
    };
}

interface PurchaseOrder {
    id: string;
    status: 'draft' | 'ordered' | 'received' | 'cancelled';
    total_amount: number;
    expected_date: string;
    vendor: { name: string; email: string };
    outlet_id: string;
}

export default function PurchaseOrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [po, setPo] = useState<PurchaseOrder | null>(null);
    const [items, setItems] = useState<POItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Add Item State
    const [showAddItem, setShowAddItem] = useState(false);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [newItemId, setNewItemId] = useState('');
    const [newItemQty, setNewItemQty] = useState('');
    const [newItemCost, setNewItemCost] = useState('');

    // Receive State
    const [showReceiveDialog, setShowReceiveDialog] = useState(false);
    const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
    const [batchExpiry, setBatchExpiry] = useState<Record<string, string>>({}); // itemId -> date

    useEffect(() => {
        if (id) {
            fetchPODetails();
            fetchPOItems();
            fetchInventoryList();
        }
    }, [id]);

    const fetchPODetails = async () => {
        const { data } = await supabase
            .from('purchase_orders')
            .select('*, vendor:vendors(*)')
            .eq('id', id)
            .single();
        setPo(data);
    };

    const fetchPOItems = async () => {
        const { data } = await supabase
            .from('purchase_order_items')
            .select('*, inventory_item:inventory_items(name, unit)')
            .eq('purchase_order_id', id);
        setItems(data || []);
    };

    const fetchInventoryList = async () => {
        const { data } = await supabase.from('inventory_items').select('id, name, cost_per_unit').order('name');
        setInventoryItems(data || []);
    };

    const handleAddItem = async () => {
        if (!newItemId || !newItemQty || !newItemCost) return;

        try {
            const qty = parseFloat(newItemQty);
            const cost = parseFloat(newItemCost);
            const subtotal = qty * cost;

            const { error } = await supabase.from('purchase_order_items').insert({
                purchase_order_id: id,
                inventory_item_id: newItemId,
                quantity: qty,
                unit_cost: cost,
                subtotal: subtotal
            });

            if (error) throw error;

            // Update PO total
            await updatePOTotal();

            setShowAddItem(false);
            setNewItemId('');
            setNewItemQty('');
            setNewItemCost('');
            fetchPOItems();
            toast({ title: 'Item ditambahkan' });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        await supabase.from('purchase_order_items').delete().eq('id', itemId);
        await updatePOTotal();
        fetchPOItems();
    };

    const updatePOTotal = async () => {
        // Recalculate total from items
        const { data } = await supabase.from('purchase_order_items').select('subtotal').eq('purchase_order_id', id);
        const total = data?.reduce((sum, item) => sum + item.subtotal, 0) || 0;

        await supabase.from('purchase_orders').update({ total_amount: total }).eq('id', id);
        fetchPODetails();
    };

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === 'received') {
            setShowReceiveDialog(true);
            return;
        }

        try {
            const { error } = await supabase
                .from('purchase_orders')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            fetchPODetails();
            toast({ title: 'Status diperbarui', description: `PO status: ${newStatus}` });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const handleReceiveItems = async () => {
        try {
            // 1. Update PO Status
            await supabase.from('purchase_orders').update({
                status: 'received',
                updated_at: new Date().toISOString()
            }).eq('id', id);

            // 2. Create Expense Record automatically
            if (po && po.total_amount > 0) {
                // Get or create 'Inventory Purchase' category
                const { data: categories } = await supabase.from('expense_categories').select('id').eq('name', 'Inventory Purchase').single();
                let categoryId = categories?.id;

                if (!categoryId) {
                    const { data: newCat } = await supabase.from('expense_categories').insert({ name: 'Inventory Purchase', description: 'Auto-generated from PO' }).select().single();
                    categoryId = newCat?.id;
                }

                await supabase.from('expenses').insert({
                    outlet_id: po.outlet_id,
                    user_id: (await supabase.auth.getUser()).data.user?.id,
                    category_id: categoryId,
                    amount: po.total_amount,
                    description: `Purchase Order #${id?.substring(0, 8)} - ${po.vendor?.name}`,
                    expense_date: receiveDate,
                    status: 'approved', // Auto-approve PO expenses
                    notes: 'Auto-generated from Inventory Receive'
                });
            }

            // 3. Create Inventory Batches & Update Stock for each item
            for (const item of items) {
                const expiryDate = batchExpiry[item.id] || null;

                // Create Batch
                await supabase.from('inventory_batches').insert({
                    inventory_item_id: item.inventory_item_id,
                    outlet_id: po?.outlet_id,
                    initial_quantity: item.quantity,
                    current_quantity: item.quantity, // Full amount received
                    expiration_date: expiryDate,
                    received_date: receiveDate,
                    purchase_order_id: id,
                    sku_batch: `PO-${id?.substring(0, 6)}`
                });

                // Update Main Inventory Stock (Increment)
                // Note: Ideally allow partial receiving, but for MVP assuming full receive
                const { data: currentItem } = await supabase
                    .from('inventory_items')
                    .select('current_stock')
                    .eq('id', item.inventory_item_id)
                    .single();

                const newStock = (currentItem?.current_stock || 0) + item.quantity;

                await supabase.from('inventory_items')
                    .update({ current_stock: newStock })
                    .eq('id', item.inventory_item_id);

                // Generate Transaction Log
                await supabase.from('inventory_transactions').insert({
                    outlet_id: po?.outlet_id,
                    inventory_item_id: item.inventory_item_id,
                    user_id: (await supabase.auth.getUser()).data.user?.id,
                    type: 'purchase',
                    quantity: item.quantity,
                    notes: `Received from PO #${id?.substring(0, 8)}`
                });
            }

            toast({ title: 'Barang Diterima!', description: 'Stok dan Batch telah diupdate.' });
            setShowReceiveDialog(false);
            fetchPODetails();

        } catch (error: any) {
            toast({ title: 'Gagal Menerima Barang', description: error.message, variant: 'destructive' });
        }
    };

    if (!po) return <div>Loading...</div>;

    return (
        <MainLayout>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/inventory/purchase-orders">
                            <Button variant="ghost" size="icon"><ArrowLeft /></Button>
                        </Link>
                        <div>
                            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                                PO #{po.id.substring(0, 8)}
                                <Badge variant={po.status === 'ordered' ? 'default' : 'outline'}>{po.status.toUpperCase()}</Badge>
                            </h1>
                            <p className="text-muted-foreground">{po.vendor?.name}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {po.status === 'draft' && (
                            <Button onClick={() => handleStatusChange('ordered')} className="bg-blue-600 hover:bg-blue-700">
                                <Send className="h-4 w-4 mr-2" />
                                Kirim Order
                            </Button>
                        )}
                        {po.status === 'ordered' && (
                            <Button onClick={() => handleStatusChange('received')} className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Terima Barang
                            </Button>
                        )}
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Items</CardTitle>
                            {po.status === 'draft' && (
                                <Button size="sm" variant="outline" onClick={() => setShowAddItem(true)}>
                                    <Plus className="h-4 w-4 mr-2" /> Tambah Item
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Cost</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No items added</TableCell></TableRow>
                                ) : (
                                    items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.inventory_item?.name}</TableCell>
                                            <TableCell className="text-right">{item.quantity} {item.inventory_item?.unit}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                                            <TableCell className="text-right">
                                                {po.status === 'draft' && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                                <TableRow className="bg-muted/50 font-bold">
                                    <TableCell colSpan={3} className="text-right">Total</TableCell>
                                    <TableCell className="text-right">{formatCurrency(po.total_amount)}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Add Item Dialog */}
                <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Tambah Item ke PO</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Pilih Item</Label>
                                <Select value={newItemId} onValueChange={(val) => {
                                    setNewItemId(val);
                                    const item = inventoryItems.find(i => i.id === val);
                                    if (item) setNewItemCost(item.cost_per_unit?.toString() || '0');
                                }}>
                                    <SelectTrigger><SelectValue placeholder="Pilih Inventory Item" /></SelectTrigger>
                                    <SelectContent>
                                        {inventoryItems.map(i => (
                                            <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Quantity</Label>
                                    <Input type="number" value={newItemQty} onChange={e => setNewItemQty(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit Cost</Label>
                                    <Input type="number" value={newItemCost} onChange={e => setNewItemCost(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddItem}>Simpan</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Receive Items Dialog */}
                <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader><DialogTitle>Penerimaan Barang (Receiving)</DialogTitle></DialogHeader>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            <div className="flex items-center gap-4 bg-muted p-2 rounded">
                                <Calendar className="h-4 w-4" />
                                <span className="text-sm">Tanggal Terima:</span>
                                <Input type="date" className="w-auto" value={receiveDate} onChange={e => setReceiveDate(e.target.value)} />
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Qty Masuk</TableHead>
                                        <TableHead>Tanggal Kadaluarsa (Expiry)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.inventory_item?.name}</TableCell>
                                            <TableCell className="text-right">{item.quantity} {item.inventory_item?.unit}</TableCell>
                                            <TableCell>
                                                <Input
                                                    type="date"
                                                    placeholder="Expiry Date"
                                                    onChange={(e) => setBatchExpiry({ ...batchExpiry, [item.id]: e.target.value })}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>Batal</Button>
                            <Button onClick={handleReceiveItems} className="bg-green-600">Konfirmasi Terima Barang</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
}
