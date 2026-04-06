import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, FileText, ArrowLeft, Eye, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOutlet } from '@/hooks/useOutlet';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PurchaseOrder {
    id: string;
    po_number: string;
    supplier_id: string | null;
    warehouse_id: string;
    status: 'draft' | 'submitted' | 'approved' | 'received' | 'cancelled';
    total_amount: number;
    ordered_date: string;
    created_at: string;
    updated_at: string;
    ordered_by: string | null;
    vendor: {
        name: string;
    };
}

export default function PurchaseOrders() {
    const { isOwner, isManager, user } = useAuth();
    const { selectedOutlet } = useOutlet();
    const { toast } = useToast();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [syncing, setSyncing] = useState(false);

    // Create PO Dialog State
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newOrderVendor, setNewOrderVendor] = useState('');
    const [newOrderWarehouse, setNewOrderWarehouse] = useState('');
    const [newOrderDate, setNewOrderDate] = useState('');
    const [vendors, setVendors] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);

    useEffect(() => {
        fetchOrders();
        fetchVendors();
        fetchWarehouses();
    }, [selectedOutlet]);

    useEffect(() => {
        const channel = supabase
            .channel('purchase-orders-live')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'purchase_orders' },
                () => {
                    fetchOrders();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'purchase_order_items' },
                () => {
                    fetchOrders();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'suppliers' },
                () => {
                    fetchVendors();
                    fetchOrders();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'warehouses' },
                () => {
                    fetchWarehouses();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchOrders = async () => {
        try {
            // First get orders
            const { data: ordersData, error: ordersError } = await supabase
                .from('purchase_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            // Then get vendor names separately (from suppliers table)
            const vendorIds = [...new Set((ordersData || []).map((o: any) => o.supplier_id).filter(Boolean))];
            let vendorMap: Record<string, string> = {};
            
            if (vendorIds.length > 0) {
                const { data: vendorsData } = await (supabase as any)
                    .from('suppliers')
                    .select('id, name')
                    .in('id', vendorIds);
                
                vendorMap = (vendorsData || []).reduce((acc: Record<string, string>, v: any) => {
                    acc[v.id] = v.name;
                    return acc;
                }, {} as Record<string, string>);
            }

            // Combine orders with vendor names
            const ordersWithVendor = (ordersData || []).map((order: any) => ({
                ...order,
                vendor: { name: vendorMap[order.supplier_id] || order.supplier_name || 'Unknown Vendor' }
            }));

            setOrders(ordersWithVendor);
        } catch (error: any) {
            console.error('Error fetching orders:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const fetchVendors = async () => {
        const { data } = await (supabase as any).from('suppliers').select('id, name').order('name');
        setVendors(data || []);
    };

    const fetchWarehouses = async () => {
        const { data } = await (supabase as any)
            .from('warehouses')
            .select('id, name')
            .eq('is_active', true)
            .order('name');
        const warehouseData = data || [];
        setWarehouses(warehouseData);
        if (!newOrderWarehouse && warehouseData.length > 0) {
            setNewOrderWarehouse(warehouseData[0].id);
        }
    };

    const handleSyncExpenses = async () => {
        setSyncing(true);
        try {
            toast({ title: 'Processing', description: 'Syncing expenses from Purchase Orders...' });

            // 2. Scan ALL Received POs
            const { data: receivedPOs, error: poError } = await supabase
                .from('purchase_orders')
                .select('*')
                .eq('status', 'received');

            if (poError) throw poError;

            let createdCount = 0;
            if (receivedPOs && receivedPOs.length > 0) {
                for (const po of receivedPOs) {
                    if (po.total_amount <= 0) continue;

                    // Check if expense already exists for this PO
                    const poIdPrefix = po.id.substring(0, 8);
                    const { data: existingExpense } = await supabase
                        .from('expenses')
                        .select('id')
                        .ilike('description', `%${poIdPrefix}%`)
                        .maybeSingle();

                    if (!existingExpense) {
                        const vendorName = po.supplier_name || 'Unknown Vendor';
                        const expenseDate = po.updated_at ? po.updated_at.split('T')[0] : new Date().toISOString().split('T')[0];

                        if (!selectedOutlet?.id) {
                            continue;
                        }

                        const { error: insertError } = await supabase.from('expenses').insert({
                            outlet_id: selectedOutlet.id,
                            created_by: po.ordered_by || user?.id,
                            category: 'supplies',
                            amount: po.total_amount,
                            description: `Purchase Order #${poIdPrefix} - ${vendorName}`,
                            expense_date: expenseDate,
                            status: 'approved'
                        });

                        if (insertError) {
                            console.error('Error inserting expense:', insertError);
                        } else {
                            createdCount++;
                        }
                    }
                }
            }

            toast({
                title: 'Sync Complete',
                description: `Created ${createdCount} new expense(s) from ${receivedPOs?.length || 0} received PO(s).`
            });

        } catch (error: any) {
            console.error('Sync error:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSyncing(false);
        }
    };

    const handleCreateOrder = async () => {
        if (!newOrderVendor || !newOrderWarehouse) {
            toast({ title: 'Error', description: 'Pilih vendor dan gudang terlebih dahulu', variant: 'destructive' });
            return;
        }

        try {
            const poNumber = `PO-${Date.now()}`;
            const { error } = await supabase
                .from('purchase_orders')
                .insert({
                    po_number: poNumber,
                    warehouse_id: newOrderWarehouse,
                    supplier_id: newOrderVendor,
                    status: 'draft',
                    ordered_by: user?.id,
                    ordered_date: newOrderDate || new Date().toISOString().split('T')[0],
                    total_amount: 0
                });

            if (error) throw error;

            toast({ title: 'Berhasil', description: 'Purchase Order dibuat' });
            setShowCreateDialog(false);
            setNewOrderVendor('');
            setNewOrderDate('');
            setNewOrderWarehouse(warehouses[0]?.id || '');
            fetchOrders();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft': return <Badge variant="secondary">Draft</Badge>;
            case 'submitted': return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Submitted</Badge>;
            case 'approved': return <Badge variant="default" className="bg-indigo-500 hover:bg-indigo-600">Approved</Badge>;
            case 'received': return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Received</Badge>;
            case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const filteredOrders = orders.filter((order) =>
        order.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <MainLayout>
            <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Link to="/warehouse/inventory">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <h1 className="font-display text-2xl font-semibold">Purchase Orders</h1>
                        </div>
                        <p className="text-muted-foreground ml-10">Kelola pembelian barang ke supplier</p>
                    </div>
                    {(isOwner || isManager) && (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleSyncExpenses} disabled={syncing}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                {syncing ? 'Syncing...' : 'Sync Expenses'}
                            </Button>
                            <Button onClick={() => setShowCreateDialog(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Buat Pesanan Baru
                            </Button>
                        </div>
                    )}
                </div>

                <Card className="card-warm">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <CardTitle className="font-display flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Daftar Pesanan
                            </CardTitle>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari vendor..."
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
                                    <TableHead>No. PO (ID)</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Tgl. Dibuat</TableHead>
                                    <TableHead>Estimasi Tiba</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                            Belum ada Purchase Order
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {order.po_number || `${order.id.split('-')[0]}...`}
                                            </TableCell>
                                            <TableCell className="font-medium">{order.vendor?.name || 'Unknown Vendor'}</TableCell>
                                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                                            <TableCell>{new Date(order.created_at).toLocaleDateString('id-ID')}</TableCell>
                                            <TableCell>{order.ordered_date ? new Date(order.ordered_date).toLocaleDateString('id-ID') : '-'}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(order.total_amount)}</TableCell>
                                            <TableCell className="text-right">
                                                <Link to={`/warehouse/purchase-orders/${order.id}`}>
                                                    <Button variant="ghost" size="sm">
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        Detail
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Create Order Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-display">Buat Purchase Order Baru</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Pilih Vendor</Label>
                            <Select value={newOrderVendor} onValueChange={setNewOrderVendor}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {vendors.map((v) => (
                                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Pilih Gudang</Label>
                            <Select value={newOrderWarehouse} onValueChange={setNewOrderWarehouse}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Gudang" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((w) => (
                                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tanggal Order (Opsional)</Label>
                            <Input
                                type="date"
                                value={newOrderDate}
                                onChange={(e) => setNewOrderDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Batal</Button>
                        <Button onClick={handleCreateOrder}>Buat Draft</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
