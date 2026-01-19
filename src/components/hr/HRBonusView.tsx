import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOutlet } from '@/hooks/useOutlet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { Target, Gift, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function HRBonusView() {
    const { selectedOutlet } = useOutlet();
    const { toast } = useToast();
    const [targets, setTargets] = useState<any[]>([]);
    const [bonuses, setBonuses] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    // Dialog states
    const [isAddTargetOpen, setIsAddTargetOpen] = useState(false);
    const [isAddBonusOpen, setIsAddBonusOpen] = useState(false);

    // Form states
    const [newTarget, setNewTarget] = useState({
        product_id: 'all',
        target_amount: '',
        target_date: new Date().toISOString().split('T')[0],
        period_type: 'monthly'
    });

    const [newBonus, setNewBonus] = useState({
        employee_id: '',
        amount: '',
        bonus_type: 'performance',
        description: '',
        achievement_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (selectedOutlet) {
            fetchTargets();
            fetchBonuses();
            fetchEmployees();
            fetchProducts();
        }
    }, [selectedOutlet]);

    const fetchTargets = async () => {
        const { data } = await supabase
            .from('sales_targets')
            .select('*, products(name)')
            .eq('outlet_id', selectedOutlet?.id)
            .order('target_date', { ascending: false });
        setTargets(data || []);
    };

    const fetchBonuses = async () => {
        // We need to join via employee to filter by outlet if needed, or just show all for this outlet's employees
        // Simpler: Fetch employees of this outlet first, then bonuses for those employees
        // Or if bonuses table doesn't have outlet_id, we infer from employee.
        // Let's assume we show bonuses for employees compliant with currently selected outlet

        // First get employee IDs of this outlet
        const { data: outletEmployees } = await supabase
            .from('employees')
            .select('id')
            .eq('outlet_id', selectedOutlet?.id);

        if (outletEmployees && outletEmployees.length > 0) {
            const empIds = outletEmployees.map(e => e.id);
            const { data } = await supabase
                .from('employee_bonuses')
                .select('*, employees(full_name)')
                .in('employee_id', empIds)
                .order('achievement_date', { ascending: false });
            setBonuses(data || []);
        } else {
            setBonuses([]);
        }
    };

    const fetchEmployees = async () => {
        const { data } = await supabase
            .from('employees')
            .select('*')
            .eq('outlet_id', selectedOutlet?.id)
            .eq('is_active', true);
        setEmployees(data || []);
    };

    const fetchProducts = async () => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('outlet_id', selectedOutlet?.id);
        setProducts(data || []);
    };

    const handleAddTarget = async () => {
        try {
            if (!newTarget.target_amount) return;

            const payload: any = {
                outlet_id: selectedOutlet?.id,
                target_amount: parseFloat(newTarget.target_amount),
                target_date: newTarget.target_date,
                period_type: newTarget.period_type
            };

            if (newTarget.product_id !== 'all') {
                payload.product_id = newTarget.product_id;
            }

            const { error } = await supabase.from('sales_targets').insert(payload);
            if (error) throw error;

            toast({ title: 'Success', description: 'Target sales berhasil ditambahkan' });
            setIsAddTargetOpen(false);
            fetchTargets();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const handleAddBonus = async () => {
        try {
            if (!newBonus.employee_id || !newBonus.amount) return;

            const payload = {
                employee_id: newBonus.employee_id,
                amount: parseFloat(newBonus.amount),
                bonus_type: newBonus.bonus_type,
                description: newBonus.description,
                achievement_date: newBonus.achievement_date
            };

            const { error } = await supabase.from('employee_bonuses').insert(payload);
            if (error) throw error;

            toast({ title: 'Success', description: 'Bonus berhasil ditambahkan' });
            setIsAddBonusOpen(false);
            fetchBonuses();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sales Targets Section */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5" />
                                Target Penjualan
                            </CardTitle>
                            <CardDescription>Target penjualan bulanan per outlet atau produk</CardDescription>
                        </div>
                        <Dialog open={isAddTargetOpen} onOpenChange={setIsAddTargetOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Tambah Target
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Tambah Target Sales</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Periode (Bulan)</Label>
                                        <Input
                                            type="date"
                                            value={newTarget.target_date}
                                            onChange={e => setNewTarget({ ...newTarget, target_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Produk (Opsional)</Label>
                                        <Select
                                            value={newTarget.product_id}
                                            onValueChange={v => setNewTarget({ ...newTarget, product_id: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih Produk" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua Produk (Outlet)</SelectItem>
                                                {products.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Target Amount (Rp)</Label>
                                        <Input
                                            type="number"
                                            value={newTarget.target_amount}
                                            onChange={e => setNewTarget({ ...newTarget, target_amount: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddTargetOpen(false)}>Batal</Button>
                                    <Button onClick={handleAddTarget}>Simpan</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Periode</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {targets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground">Belum ada target</TableCell>
                                    </TableRow>
                                ) : (
                                    targets.map((target) => (
                                        <TableRow key={target.id}>
                                            <TableCell>{new Date(target.target_date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</TableCell>
                                            <TableCell>{target.products?.name || 'Total Outlet'}</TableCell>
                                            <TableCell>{formatCurrency(target.target_amount)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Employee Bonuses Section */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Gift className="h-5 w-5" />
                                Bonus Karyawan
                            </CardTitle>
                            <CardDescription>Bonus kinerja dan insentif</CardDescription>
                        </div>
                        <Dialog open={isAddBonusOpen} onOpenChange={setIsAddBonusOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Tambah Bonus
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Tambah Bonus Karyawan</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Karyawan</Label>
                                        <Select
                                            value={newBonus.employee_id}
                                            onValueChange={v => setNewBonus({ ...newBonus, employee_id: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih Karyawan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.map(e => (
                                                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Tipe Bonus</Label>
                                        <Select
                                            value={newBonus.bonus_type}
                                            onValueChange={v => setNewBonus({ ...newBonus, bonus_type: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="performance">Performa</SelectItem>
                                                <SelectItem value="target_achievement">Target Sales</SelectItem>
                                                <SelectItem value="attendance">Kehadiran</SelectItem>
                                                <SelectItem value="thr">THR</SelectItem>
                                                <SelectItem value="other">Lainnya</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Jumlah (Rp)</Label>
                                        <Input
                                            type="number"
                                            value={newBonus.amount}
                                            onChange={e => setNewBonus({ ...newBonus, amount: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Tanggal</Label>
                                        <Input
                                            type="date"
                                            value={newBonus.achievement_date}
                                            onChange={e => setNewBonus({ ...newBonus, achievement_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Keterangan</Label>
                                        <Input
                                            value={newBonus.description}
                                            onChange={e => setNewBonus({ ...newBonus, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddBonusOpen(false)}>Batal</Button>
                                    <Button onClick={handleAddBonus}>Simpan</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Karyawan</TableHead>
                                    <TableHead>Tipe</TableHead>
                                    <TableHead>Jumlah</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bonuses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground">Belum ada bonus</TableCell>
                                    </TableRow>
                                ) : (
                                    bonuses.map((bonus) => (
                                        <TableRow key={bonus.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{bonus.employees?.full_name}</span>
                                                    <span className="text-xs text-muted-foreground">{new Date(bonus.achievement_date).toLocaleDateString('id-ID')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="capitalize">{bonus.bonus_type.replace('_', ' ')}</span>
                                                    <span className="text-xs text-muted-foreground">{bonus.description}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{formatCurrency(bonus.amount)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
