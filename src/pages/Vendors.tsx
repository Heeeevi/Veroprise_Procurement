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
import { Plus, Search, Truck, ArrowLeft, Phone, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import PartnerVendorSection from '@/components/PartnerVendorSection';

interface Vendor {
    id: string;
    name: string;
    contact_person: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
}

export default function Vendors() {
    const { isOwner, isManager } = useAuth();
    const { toast } = useToast();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);

    // New vendor form
    const [newVendor, setNewVendor] = useState({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        notes: ''
    });

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            const { data, error } = await supabase
                .from('partner_vendors')
                .select('*')
                .order('name');

            if (error) throw error;
            setVendors(data || []);
        } catch (error: any) {
            console.error('Error fetching vendors:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddVendor = async () => {
        if (!newVendor.name) {
            toast({ title: 'Error', description: 'Nama vendor harus diisi', variant: 'destructive' });
            return;
        }

        try {
            const { error } = await supabase.from('partner_vendors').insert(newVendor);

            if (error) throw error;

            toast({ title: 'Berhasil', description: 'Vendor berhasil ditambahkan' });
            setShowAddDialog(false);
            setNewVendor({ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' });
            fetchVendors();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const filteredVendors = vendors.filter((vendor) =>
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <MainLayout>
            <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Link to="/inventory">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <h1 className="font-display text-2xl font-semibold">Vendor Management</h1>
                        </div>
                        <p className="text-muted-foreground ml-10">Kelola supplier dan kontak vendor</p>
                    </div>
                    {(isOwner || isManager) && (
                        <Button onClick={() => setShowAddDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah Vendor
                        </Button>
                    )}
                </div>

                {/* Partner Vendor Recommendations */}
                <PartnerVendorSection />

                <Card className="card-warm">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <CardTitle className="font-display flex items-center gap-2">
                                <Truck className="h-5 w-5" />
                                Daftar Vendor
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
                                    <TableHead>Nama Vendor</TableHead>
                                    <TableHead>Kontak Person</TableHead>
                                    <TableHead>Kontak Info</TableHead>
                                    <TableHead>Alamat</TableHead>
                                    <TableHead>Catatan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredVendors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            Belum ada data vendor
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredVendors.map((vendor) => (
                                        <TableRow key={vendor.id}>
                                            <TableCell className="font-medium">{vendor.name}</TableCell>
                                            <TableCell>{vendor.contact_person || '-'}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 text-sm">
                                                    {vendor.phone && (
                                                        <div className="flex items-center gap-1">
                                                            <Phone className="h-3 w-3 text-muted-foreground" />
                                                            {vendor.phone}
                                                        </div>
                                                    )}
                                                    {vendor.email && (
                                                        <div className="flex items-center gap-1">
                                                            <Mail className="h-3 w-3 text-muted-foreground" />
                                                            {vendor.email}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 max-w-[200px] truncate">
                                                    {vendor.address && <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />}
                                                    <span className="truncate" title={vendor.address}>{vendor.address || '-'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[150px] truncate text-muted-foreground">
                                                {vendor.notes || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Add Vendor Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="font-display">Tambah Vendor Baru</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nama Vendor *</Label>
                            <Input
                                id="name"
                                value={newVendor.name}
                                onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                                placeholder="PT. Supplier Kopi Jaya"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="contact">Kontak Person</Label>
                                <Input
                                    id="contact"
                                    value={newVendor.contact_person}
                                    onChange={(e) => setNewVendor({ ...newVendor, contact_person: e.target.value })}
                                    placeholder="Budi Santoso"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">No. Telepon</Label>
                                <Input
                                    id="phone"
                                    value={newVendor.phone}
                                    onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                                    placeholder="0812..."
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={newVendor.email}
                                onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                                placeholder="sales@supplier.com"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="address">Alamat</Label>
                            <Textarea
                                id="address"
                                value={newVendor.address}
                                onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                                placeholder="Jl. Raya..."
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="notes">Catatan</Label>
                            <Textarea
                                id="notes"
                                value={newVendor.notes}
                                onChange={(e) => setNewVendor({ ...newVendor, notes: e.target.value })}
                                placeholder="Terms pembayaran, jadwal kirim, dll"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
                        <Button onClick={handleAddVendor}>Simpan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
