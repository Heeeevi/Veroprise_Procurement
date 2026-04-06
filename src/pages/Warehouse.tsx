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
import { Search, Warehouse as WarehouseIcon, ArrowRight, Package, Truck, RefreshCw, ClipboardList, FileText, Printer, ClipboardCheck, MoreVertical, ShoppingCart, Users, Layers, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';

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

interface DeliveryDocument {
    id: string;
    document_number: string;
    doc_type: 'surat_jalan' | 'tanda_terima';
    doc_date: string;
    receiver_unit: string;
    receiver_name: string | null;
    status: string;
    notes: string | null;
}

interface DailyAuditItem {
    product_id: string;
    product_name: string;
    system_qty: number;
    physical_qty: number;
    note: string;
}

interface MaterialRequest {
    id: string;
    transfer_number: string;
    status: 'draft' | 'submitted' | 'approved' | 'in_transit' | 'received' | 'cancelled';
    requested_date: string;
    to_outlet_name: string;
    product_id: string;
    product_name: string;
    quantity_requested: number;
}

export default function WarehousePage() {
    const { isOwner, isManager, user } = useAuth();
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
    const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
    const [showDailyAuditDialog, setShowDailyAuditDialog] = useState(false);
    const [showMaterialRequestGuide, setShowMaterialRequestGuide] = useState(false);

    // Receive from supplier form
    const [receiveProduct, setReceiveProduct] = useState('');
    const [receiveQuantity, setReceiveQuantity] = useState('');
    const [receiveCost, setReceiveCost] = useState('');
    const [receiveSupplier, setReceiveSupplier] = useState('');

    const [transferProduct, setTransferProduct] = useState('');
    const [transferQuantity, setTransferQuantity] = useState('');
    const [transferDestination, setTransferDestination] = useState('');

    // Delivery document
    const [deliveryType, setDeliveryType] = useState<'surat_jalan' | 'tanda_terima'>('surat_jalan');
    const [deliveryProduct, setDeliveryProduct] = useState('');
    const [deliveryQuantity, setDeliveryQuantity] = useState('');
    const [deliveryReceiverUnit, setDeliveryReceiverUnit] = useState('unit_produksi');
    const [deliveryReceiverName, setDeliveryReceiverName] = useState('');
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [deliveryDocuments, setDeliveryDocuments] = useState<DeliveryDocument[]>([]);
    const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);

    // Stock Opname
    const [showOpnameDialog, setShowOpnameDialog] = useState(false);
    const [opnameItems, setOpnameItems] = useState<any[]>([]);
    const [opnameNote, setOpnameNote] = useState('');

    // Daily audit
    const [dailyAuditItems, setDailyAuditItems] = useState<DailyAuditItem[]>([]);
    const [dailyAuditNote, setDailyAuditNote] = useState('');

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
            fetchDeliveryDocuments(selectedWarehouse.id);
            fetchMaterialRequests(selectedWarehouse.id);
        }
    }, [selectedWarehouse]);

    useEffect(() => {
        if (!selectedWarehouse) {
            return;
        }

        const channel = supabase
            .channel(`warehouse-live-${selectedWarehouse.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'warehouse_inventory', filter: `warehouse_id=eq.${selectedWarehouse.id}` },
                () => {
                    fetchWarehouseInventory(selectedWarehouse.id);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'delivery_documents', filter: `warehouse_id=eq.${selectedWarehouse.id}` },
                () => {
                    fetchDeliveryDocuments(selectedWarehouse.id);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'stock_transfer_orders', filter: `from_warehouse_id=eq.${selectedWarehouse.id}` },
                () => {
                    fetchMaterialRequests(selectedWarehouse.id);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'stock_transfer_items' },
                () => {
                    fetchMaterialRequests(selectedWarehouse.id);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedWarehouse?.id]);

    const fetchMaterialRequests = async (warehouseId: string) => {
        try {
            const { data, error } = await (supabase as any)
                .from('stock_transfer_orders')
                .select('id, transfer_number, status, requested_date, notes, to_outlet:outlets(name), stock_transfer_items(product_id, quantity_requested, products(name))')
                .eq('from_warehouse_id', warehouseId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            const rows: MaterialRequest[] = (data || [])
                .map((row: any) => {
                    const item = row.stock_transfer_items?.[0];
                    if (!item) return null;

                    return {
                        id: row.id,
                        transfer_number: row.transfer_number,
                        status: row.status,
                        requested_date: row.requested_date,
                        to_outlet_name: row.to_outlet?.name || '-',
                        product_id: item.product_id,
                        product_name: item.products?.name || '-',
                        quantity_requested: Number(item.quantity_requested || 0),
                    } as MaterialRequest;
                })
                .filter(Boolean) as MaterialRequest[];

            setMaterialRequests(rows);
        } catch (error) {
            console.error('Error fetching material requests:', error);
            setMaterialRequests([]);
        }
    };

    const fetchDeliveryDocuments = async (warehouseId: string) => {
        try {
            const { data, error } = await (supabase as any)
                .from('delivery_documents')
                .select('id, document_number, doc_type, doc_date, receiver_unit, receiver_name, status, notes')
                .eq('warehouse_id', warehouseId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setDeliveryDocuments(data || []);
        } catch (error) {
            console.error('Error fetching delivery documents:', error);
            setDeliveryDocuments([]);
        }
    };

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
        if (!selectedWarehouse || !selectedOutlet || !receiveProduct || !receiveQuantity) {
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

            // Keep outlet inventory in sync for active branch context.
            const { data: outletInventory } = await (supabase as any)
                .from('inventory')
                .select('id, quantity')
                .eq('outlet_id', selectedOutlet.id)
                .eq('product_id', receiveProduct)
                .maybeSingle();

            if (outletInventory) {
                await (supabase as any)
                    .from('inventory')
                    .update({ quantity: Number(outletInventory.quantity || 0) + qty })
                    .eq('id', outletInventory.id);
            } else {
                await (supabase as any)
                    .from('inventory')
                    .insert({
                        outlet_id: selectedOutlet.id,
                        product_id: receiveProduct,
                        quantity: qty,
                        min_quantity: 0,
                        unit: 'pcs',
                        is_active: true,
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

            // Log the transfer
            const transferNumber = `TRF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`;
            const { data: transferOrder, error: transferOrderError } = await (supabase as any)
                .from('stock_transfer_orders')
                .insert({
                    transfer_number: transferNumber,
                    from_warehouse_id: selectedWarehouse.id,
                    to_outlet_id: transferDestination,
                    status: 'submitted',
                    requested_by: user?.id,
                    requested_date: new Date().toISOString().split('T')[0],
                    notes: `Material request ${qty} units`,
                })
                .select('id')
                .single();

            if (transferOrderError) throw transferOrderError;

            const selectedItem = inventory.find((item) => item.product_id === transferProduct);
            const { error: transferItemError } = await (supabase as any)
                .from('stock_transfer_items')
                .insert({
                    stock_transfer_order_id: transferOrder.id,
                    product_id: transferProduct,
                    quantity_requested: qty,
                    unit_cost: selectedItem?.cost_per_unit || 0,
                    notes: `Requested via warehouse transfer form`,
                });

            if (transferItemError) throw transferItemError;

            toast({ title: 'Berhasil', description: 'Material request berhasil diajukan' });
            setShowTransferDialog(false);
            setTransferProduct('');
            setTransferQuantity('');
            setTransferDestination('');
            fetchMaterialRequests(selectedWarehouse.id);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const handleProcessMaterialRequest = async (request: MaterialRequest) => {
        if (!selectedWarehouse) return;
        if (request.status === 'received' || request.status === 'cancelled') return;

        try {
            const qty = Number(request.quantity_requested || 0);
            if (qty <= 0) {
                toast({ title: 'Error', description: 'Qty request tidak valid', variant: 'destructive' });
                return;
            }

            const { data: warehouseStock, error: stockError } = await (supabase as any)
                .from('warehouse_inventory')
                .select('id, quantity')
                .eq('warehouse_id', selectedWarehouse.id)
                .eq('product_id', request.product_id)
                .single();

            if (stockError || !warehouseStock || Number(warehouseStock.quantity || 0) < qty) {
                toast({ title: 'Error', description: 'Stok gudang tidak mencukupi untuk request ini', variant: 'destructive' });
                return;
            }

            await (supabase as any)
                .from('warehouse_inventory')
                .update({ quantity: Number(warehouseStock.quantity || 0) - qty })
                .eq('id', warehouseStock.id);

            const { data: transferOrder } = await (supabase as any)
                .from('stock_transfer_orders')
                .select('to_outlet_id')
                .eq('id', request.id)
                .single();

            if (!transferOrder?.to_outlet_id) {
                throw new Error('Tujuan outlet request tidak ditemukan');
            }

            const { data: outletInventory } = await (supabase as any)
                .from('inventory')
                .select('id, quantity')
                .eq('outlet_id', transferOrder.to_outlet_id)
                .eq('product_id', request.product_id)
                .maybeSingle();

            if (outletInventory) {
                await (supabase as any)
                    .from('inventory')
                    .update({ quantity: Number(outletInventory.quantity || 0) + qty })
                    .eq('id', outletInventory.id);
            } else {
                await (supabase as any)
                    .from('inventory')
                    .insert({
                        outlet_id: transferOrder.to_outlet_id,
                        product_id: request.product_id,
                        quantity: qty,
                        min_quantity: 0,
                        unit: 'pcs',
                        is_active: true,
                    });
            }

            await (supabase as any)
                .from('stock_transfer_items')
                .update({
                    quantity_sent: qty,
                    quantity_received: qty,
                })
                .eq('stock_transfer_order_id', request.id)
                .eq('product_id', request.product_id);

            await (supabase as any)
                .from('stock_transfer_orders')
                .update({
                    status: 'received',
                    approved_by: user?.id,
                    approved_date: new Date().toISOString(),
                    sent_by: user?.id,
                    sent_date: new Date().toISOString(),
                    received_by: user?.id,
                    received_date: new Date().toISOString(),
                })
                .eq('id', request.id);

            toast({ title: 'Berhasil', description: `Request ${request.transfer_number} diproses dan stok dipindahkan` });
            fetchWarehouseInventory(selectedWarehouse.id);
            fetchMaterialRequests(selectedWarehouse.id);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Gagal memproses material request', variant: 'destructive' });
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
            const opnameNumber = `OPN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`;

            // 1. Create Opname Record
            const { data: opnameRef, error: opnameError } = await (supabase as any)
                .from('stock_opname')
                .insert({
                    opname_number: opnameNumber,
                    warehouse_id: selectedWarehouse.id,
                    opname_date: new Date().toISOString().split('T')[0],
                    status: 'completed',
                    performed_by: user?.id,
                    notes: opnameNote
                })
                .select()
                .single();

            if (opnameError) throw opnameError;

            const opnameItemRows = opnameItems.map((item) => {
                const matched = inventory.find((inv) => inv.product_id === item.product_id);
                return {
                    stock_opname_id: opnameRef.id,
                    product_id: item.product_id,
                    system_quantity: item.system_qty,
                    physical_quantity: parseFloat(item.actual_qty),
                    unit_cost: matched?.cost_per_unit || 0,
                    notes: item.notes || null,
                };
            });

            const { error: opnameItemsError } = await (supabase as any)
                .from('stock_opname_items')
                .insert(opnameItemRows);

            if (opnameItemsError) throw opnameItemsError;

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

        const printDeliveryDocument = (payload: {
                documentNumber: string;
                docType: 'surat_jalan' | 'tanda_terima';
                warehouseName: string;
                receiverUnit: string;
                receiverName: string;
                productName: string;
                quantity: number;
            note: string;
        }) => {
                const docLabel = payload.docType === 'surat_jalan' ? 'Surat Jalan' : 'Tanda Terima';
                const html = `
                    <html>
                    <head>
                        <title>${docLabel} - ${payload.documentNumber}</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
                            h1 { margin: 0 0 8px 0; }
                            .muted { color: #6b7280; font-size: 12px; }
                            .row { margin: 8px 0; }
                            .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; margin-top: 12px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
                        </style>
                    </head>
                    <body>
                        <h1>${docLabel}</h1>
                        <div class="muted">No Dokumen: ${payload.documentNumber}</div>
                        <div class="muted">Tanggal: ${new Date().toLocaleDateString('id-ID')}</div>

                        <div class="box">
                            <div class="row"><strong>Gudang:</strong> ${payload.warehouseName}</div>
                            <div class="row"><strong>Unit Penerima:</strong> ${payload.receiverUnit}</div>
                            <div class="row"><strong>Nama Penerima:</strong> ${payload.receiverName || '-'}</div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>Produk</th>
                                    <th>Jumlah</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>${payload.productName}</td>
                                    <td>${payload.quantity}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div class="row"><strong>Catatan:</strong> ${payload.note || '-'}</div>
                    </body>
                    </html>
                `;

                const printWindow = window.open('', '_blank', 'width=900,height=700');
                if (!printWindow) return;
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
        };

            const handleReprintDeliveryDocument = async (doc: DeliveryDocument) => {
                try {
                    const { data: docItem, error } = await (supabase as any)
                        .from('delivery_document_items')
                        .select('quantity, product_id, products(name)')
                        .eq('delivery_document_id', doc.id)
                        .limit(1)
                        .single();

                    if (error) throw error;

                    printDeliveryDocument({
                        documentNumber: doc.document_number,
                        docType: doc.doc_type,
                        warehouseName: selectedWarehouse?.name || '-',
                        receiverUnit: doc.receiver_unit,
                        receiverName: doc.receiver_name || '-',
                        productName: docItem?.products?.name || 'Produk',
                        quantity: Number(docItem?.quantity || 0),
                        note: doc.notes || '',
                    });
                } catch (error: any) {
                    toast({ title: 'Error', description: error.message || 'Gagal reprint dokumen', variant: 'destructive' });
                }
            };

            const handleOpenDailyAudit = () => {
                if (!selectedWarehouse) return;
                const items: DailyAuditItem[] = inventory.map((item) => ({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    system_qty: item.quantity,
                    physical_qty: item.quantity,
                    note: '',
                }));
                setDailyAuditItems(items);
                setDailyAuditNote('');
                setShowDailyAuditDialog(true);
            };

            const handleDailyAuditChange = (index: number, field: keyof DailyAuditItem, value: any) => {
                const next = [...dailyAuditItems];
                next[index] = { ...next[index], [field]: value };
                setDailyAuditItems(next);
            };

            const handleSaveDailyAudit = async () => {
                if (!selectedWarehouse || dailyAuditItems.length === 0) return;

                try {
                    const auditNumber = `AUD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`;
                    const auditDate = new Date().toISOString().split('T')[0];

                    const { data: existingAudit } = await (supabase as any)
                        .from('daily_stock_audits')
                        .select('id, audit_number')
                        .eq('warehouse_id', selectedWarehouse.id)
                        .eq('audit_date', auditDate)
                        .maybeSingle();

                    let audit: any = existingAudit;

                    if (existingAudit) {
                        const { data: updatedAudit, error: updateAuditError } = await (supabase as any)
                            .from('daily_stock_audits')
                            .update({
                                status: 'completed',
                                auditor_id: user?.id,
                                notes: dailyAuditNote || null,
                            })
                            .eq('id', existingAudit.id)
                            .select()
                            .single();

                        if (updateAuditError) throw updateAuditError;
                        audit = updatedAudit;

                        const { error: deleteItemsError } = await (supabase as any)
                            .from('daily_stock_audit_items')
                            .delete()
                            .eq('daily_stock_audit_id', existingAudit.id);

                        if (deleteItemsError) throw deleteItemsError;
                    } else {
                        const { data: newAudit, error: auditError } = await (supabase as any)
                            .from('daily_stock_audits')
                            .insert({
                                audit_number: auditNumber,
                                audit_date: auditDate,
                                warehouse_id: selectedWarehouse.id,
                                status: 'completed',
                                auditor_id: user?.id,
                                notes: dailyAuditNote || null,
                            })
                            .select()
                            .single();

                        if (auditError) throw auditError;
                        audit = newAudit;
                    }

                    const rows = dailyAuditItems.map((item) => ({
                        daily_stock_audit_id: audit.id,
                        product_id: item.product_id,
                        system_qty: Number(item.system_qty),
                        physical_qty: Number(item.physical_qty),
                        note: item.note || null,
                    }));

                    const { error: itemsError } = await (supabase as any)
                        .from('daily_stock_audit_items')
                        .insert(rows);

                    if (itemsError) throw itemsError;

                    toast({ title: 'Berhasil', description: `${audit.audit_number || auditNumber} tersimpan sebagai audit harian` });
                    setShowDailyAuditDialog(false);
                } catch (error: any) {
                    toast({ title: 'Error', description: error.message || 'Gagal menyimpan audit harian', variant: 'destructive' });
                }
            };

        const handleCreateDeliveryDocument = async () => {
                if (!selectedWarehouse || !deliveryProduct || !deliveryQuantity) {
                        toast({ title: 'Error', description: 'Lengkapi data dokumen pengiriman', variant: 'destructive' });
                        return;
                }

                try {
                        const qty = parseFloat(deliveryQuantity);
                        const selectedItem = inventory.find((item) => item.product_id === deliveryProduct);

                        if (!selectedItem || selectedItem.quantity < qty) {
                                toast({ title: 'Error', description: 'Stok gudang tidak cukup untuk dokumen ini', variant: 'destructive' });
                                return;
                        }

                        const prefix = deliveryType === 'surat_jalan' ? 'SJ' : 'TT';
                        const documentNumber = `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`;

                        const { data: docData, error: docError } = await (supabase as any)
                                .from('delivery_documents')
                                .insert({
                                        document_number: documentNumber,
                                        doc_type: deliveryType,
                                        warehouse_id: selectedWarehouse.id,
                                        receiver_unit: deliveryReceiverUnit,
                                        receiver_name: deliveryReceiverName || null,
                                        status: 'issued',
                                        issued_by: user?.id,
                                        issued_at: new Date().toISOString(),
                                        notes: deliveryNotes || null,
                                })
                                .select()
                                .single();

                        if (docError) throw docError;

                        const { error: itemError } = await (supabase as any)
                                .from('delivery_document_items')
                                .insert({
                                        delivery_document_id: docData.id,
                                        product_id: deliveryProduct,
                                        quantity: qty,
                                        unit: 'kg',
                                        notes: deliveryNotes || null,
                                });

                        if (itemError) throw itemError;

                        printDeliveryDocument({
                                documentNumber,
                                docType: deliveryType,
                                warehouseName: selectedWarehouse.name,
                                receiverUnit: deliveryReceiverUnit,
                                receiverName: deliveryReceiverName,
                                productName: selectedItem.product_name,
                                quantity: qty,
                                note: deliveryNotes,
                        });

                        toast({ title: 'Berhasil', description: `${documentNumber} berhasil dibuat dan siap dicetak` });
                        setShowDeliveryDialog(false);
                        setDeliveryType('surat_jalan');
                        setDeliveryProduct('');
                        setDeliveryQuantity('');
                        setDeliveryReceiverUnit('unit_produksi');
                        setDeliveryReceiverName('');
                        setDeliveryNotes('');
                        fetchDeliveryDocuments(selectedWarehouse.id);
                } catch (error: any) {
                        toast({ title: 'Error', description: error.message || 'Gagal membuat dokumen pengiriman', variant: 'destructive' });
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
                        <p className="text-muted-foreground">Kelola stok gudang pusat, material request, dan distribusi ke unit</p>
                    </div>
                    {(isOwner || isManager) && (
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => setShowReceiveDialog(true)}>
                                <Truck className="h-4 w-4 mr-2" />
                                Terima dari Supplier
                            </Button>
                            <Button onClick={() => setShowTransferDialog(true)}>
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Material Request
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        <MoreVertical className="h-4 w-4 mr-2" />
                                        Lainnya
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setShowDeliveryDialog(true)}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Surat Jalan / Tanda Terima
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleOpenDailyAudit}>
                                        <ClipboardCheck className="h-4 w-4 mr-2" />
                                        Audit Harian
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleOpenOpname}>
                                        <ClipboardList className="h-4 w-4 mr-2" />
                                        Stock Opname
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>

                {/* Quick Navigation to Important Sections */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link to="/warehouse/inventory" className="no-underline">
                        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-primary/30 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="p-3 bg-blue-200 dark:bg-blue-800 rounded-lg">
                                    <Package className="h-6 w-6 text-blue-700 dark:text-blue-200" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">Inventory</h3>
                                    <p className="text-xs text-muted-foreground">Kelola produk gudang</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                    
                    <Link to="/warehouse/purchase-orders" className="no-underline">
                        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-primary/30 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="p-3 bg-green-200 dark:bg-green-800 rounded-lg">
                                    <ShoppingCart className="h-6 w-6 text-green-700 dark:text-green-200" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">Purchase Orders</h3>
                                    <p className="text-xs text-muted-foreground">Pesan barang dari supplier</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                    
                    <Link to="/warehouse/vendors" className="no-underline">
                        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-primary/30 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="p-3 bg-orange-200 dark:bg-orange-800 rounded-lg">
                                    <Users className="h-6 w-6 text-orange-700 dark:text-orange-200" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">Manage Vendors</h3>
                                    <p className="text-xs text-muted-foreground">Kelola data supplier</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
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
                        <div className="overflow-x-auto">
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
                        </div>
                    </CardContent>
                </Card>

                <Card className="card-warm">
                    <CardHeader>
                        <CardTitle className="font-display flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Riwayat Delivery Document
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>No Dokumen</TableHead>
                                    <TableHead>Tipe</TableHead>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {deliveryDocuments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                                            Belum ada dokumen delivery untuk gudang ini
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    deliveryDocuments.map((doc) => (
                                        <TableRow key={doc.id}>
                                            <TableCell className="font-medium">{doc.document_number}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {doc.doc_type === 'surat_jalan' ? 'Surat Jalan' : 'Tanda Terima'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{new Date(doc.doc_date).toLocaleDateString('id-ID')}</TableCell>
                                            <TableCell>{doc.receiver_unit}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{doc.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleReprintDeliveryDocument(doc)}
                                                >
                                                    <Printer className="h-4 w-4 mr-2" />
                                                    Reprint
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card className="card-warm">
                    <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                            <CardTitle className="font-display flex items-center gap-2 text-base">
                                <Layers className="h-5 w-5" />
                                Alur Material Request
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowMaterialRequestGuide((value) => !value)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${showMaterialRequestGuide ? 'rotate-180' : ''}`} />
                                {showMaterialRequestGuide ? 'Sembunyikan' : 'Lihat alur'}
                            </Button>
                        </div>
                    </CardHeader>
                    {showMaterialRequestGuide && (
                        <CardContent className="pt-0 pb-4">
                            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                                <div className="mb-2 font-medium text-foreground">Cara Kerja Material Request:</div>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <span className="font-mono text-xs text-muted-foreground">1.</span>
                                        <p>Unit POS/Peracikan membuat request material via form "Material Request" di menu Gudang</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-mono text-xs text-muted-foreground">2.</span>
                                        <p>Tim Gudang melihat request masuk di tabel bawah dan memproses pengiriman barang</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-mono text-xs text-muted-foreground">3.</span>
                                        <p>Gudang membuat Surat Jalan atau Tanda Terima untuk dokumentasi pengiriman</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="font-mono text-xs text-muted-foreground">4.</span>
                                        <p>Status request berubah ke "received" setelah disetujui dan barang masuk ke unit tujuan</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    )}

                    <CardContent className="space-y-4 pt-0">
                        <div>
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <ArrowRight className="h-4 w-4" />
                                Daftar Material Request Masuk
                            </h3>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>No Request</TableHead>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead>Outlet Tujuan</TableHead>
                                            <TableHead>Produk</TableHead>
                                            <TableHead>Qty</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {materialRequests.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                                                    Belum ada material request
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            materialRequests.map((request) => (
                                                <TableRow key={request.id}>
                                                    <TableCell className="font-medium">{request.transfer_number}</TableCell>
                                                    <TableCell>{request.requested_date ? new Date(request.requested_date).toLocaleDateString('id-ID') : '-'}</TableCell>
                                                    <TableCell>{request.to_outlet_name}</TableCell>
                                                    <TableCell>{request.product_name}</TableCell>
                                                    <TableCell>{request.quantity_requested}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={request.status === 'received' ? 'secondary' : 'outline'}>
                                                            {request.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {request.status !== 'received' && request.status !== 'cancelled' ? (
                                                            <Button size="sm" onClick={() => handleProcessMaterialRequest(request)}>
                                                                Proses
                                                            </Button>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">Selesai</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
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
                        <DialogTitle className="font-display">Ajukan Material Request</DialogTitle>
                        <DialogDescription>
                            Buat request material dari gudang {selectedWarehouse?.name} ke outlet/unit produksi
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
                            <Label>Jumlah Request</Label>
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
                            Ajukan Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Daily Audit Dialog */}
            <Dialog open={showDailyAuditDialog} onOpenChange={setShowDailyAuditDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-display">Audit Mandiri Harian Gudang</DialogTitle>
                        <DialogDescription>
                            Catat stok fisik harian untuk kontrol dan jejak audit.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produk</TableHead>
                                        <TableHead className="w-24">Sistem</TableHead>
                                        <TableHead className="w-24">Fisik</TableHead>
                                        <TableHead className="w-24">Selisih</TableHead>
                                        <TableHead>Catatan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dailyAuditItems.map((item, index) => {
                                        const diff = Number(item.physical_qty || 0) - Number(item.system_qty || 0);
                                        return (
                                            <TableRow key={item.product_id}>
                                                <TableCell className="font-medium">{item.product_name}</TableCell>
                                                <TableCell>{item.system_qty}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={item.physical_qty}
                                                        onChange={(e) => handleDailyAuditChange(index, 'physical_qty', Number(e.target.value))}
                                                        className="h-8"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <span className={diff === 0 ? 'text-muted-foreground' : diff > 0 ? 'text-green-600 font-semibold' : 'text-destructive font-semibold'}>
                                                        {diff > 0 ? `+${diff}` : diff}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.note}
                                                        onChange={(e) => handleDailyAuditChange(index, 'note', e.target.value)}
                                                        placeholder="Catatan item"
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
                            <Label>Catatan Audit</Label>
                            <Input
                                value={dailyAuditNote}
                                onChange={(e) => setDailyAuditNote(e.target.value)}
                                placeholder="Catatan umum audit harian"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDailyAuditDialog(false)}>Batal</Button>
                        <Button onClick={handleSaveDailyAudit}>
                            <ClipboardCheck className="h-4 w-4 mr-2" />
                            Simpan Audit Harian
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delivery Document Dialog */}
            <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-display">Buat Dokumen Pengiriman</DialogTitle>
                        <DialogDescription>
                            Buat surat jalan atau tanda terima untuk perpindahan material internal
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Jenis Dokumen</Label>
                            <Select value={deliveryType} onValueChange={(v) => setDeliveryType(v as 'surat_jalan' | 'tanda_terima')}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="surat_jalan">Surat Jalan</SelectItem>
                                    <SelectItem value="tanda_terima">Tanda Terima</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Produk</Label>
                            <Select value={deliveryProduct} onValueChange={setDeliveryProduct}>
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Jumlah</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={deliveryQuantity}
                                    onChange={(e) => setDeliveryQuantity(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Unit Penerima</Label>
                                <Input
                                    placeholder="unit_produksi"
                                    value={deliveryReceiverUnit}
                                    onChange={(e) => setDeliveryReceiverUnit(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Nama Penerima</Label>
                            <Input
                                placeholder="Nama personil penerima"
                                value={deliveryReceiverName}
                                onChange={(e) => setDeliveryReceiverName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Catatan</Label>
                            <Input
                                placeholder="Keterangan tambahan"
                                value={deliveryNotes}
                                onChange={(e) => setDeliveryNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeliveryDialog(false)}>Batal</Button>
                        <Button onClick={handleCreateDeliveryDocument}>
                            <FileText className="h-4 w-4 mr-2" />
                            Buat & Cetak
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
