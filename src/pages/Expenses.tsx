import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useOutlet } from '@/hooks/useOutlet';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Expenses() {
    const { selectedOutlet } = useOutlet();
    const { toast } = useToast();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [showDialog, setShowDialog] = useState(false);

    const [newExpense, setNewExpense] = useState({
        amount: '',
        category_id: '',
        description: '',
        expense_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        if (selectedOutlet) {
            fetchExpenses();
            fetchCategories();
        }
    }, [selectedOutlet]);

    const fetchExpenses = async () => {
        const { data } = await supabase
            .from('expenses')
            .select('*, category:expense_categories(name)')
            .eq('outlet_id', selectedOutlet?.id)
            .order('expense_date', { ascending: false });
        setExpenses(data || []);
    };

    const fetchCategories = async () => {
        const { data } = await supabase.from('expense_categories').select('*');
        setCategories(data || []);
    };

    const handleSubmit = async () => {
        if (!newExpense.amount || !newExpense.category_id) {
            toast({ title: 'Error', description: 'Isi jumlah dan kategori', variant: 'destructive' });
            return;
        }

        try {
            const { error } = await supabase.from('expenses').insert({
                outlet_id: selectedOutlet?.id,
                user_id: (await supabase.auth.getUser()).data.user?.id,
                amount: parseFloat(newExpense.amount),
                category_id: newExpense.category_id,
                description: newExpense.description,
                expense_date: newExpense.expense_date,
                status: 'approved',
                notes: newExpense.notes
            });

            if (error) throw error;
            toast({ title: 'Success', description: 'Pengeluaran dicatat' });
            setShowDialog(false);
            fetchExpenses();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus pengeluaran ini?')) return;
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (!error) fetchExpenses();
    };

    return (
        <MainLayout>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="font-display text-2xl font-semibold">Pengeluaran</h1>
                        <p className="text-muted-foreground">Catat biaya operasional (listrik, sewa, dll)</p>
                    </div>
                    <Button onClick={() => setShowDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Tambah Pengeluaran
                    </Button>
                </div>

                <Card>
                    <CardHeader><CardTitle>Riwayat Pengeluaran</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Deskripsi</TableHead>
                                    <TableHead>Kategori</TableHead>
                                    <TableHead className="text-right">Jumlah</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Belum ada data</TableCell></TableRow>
                                ) : (
                                    expenses.map(exp => (
                                        <TableRow key={exp.id}>
                                            <TableCell>{new Date(exp.expense_date).toLocaleDateString('id-ID')}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{exp.description || '-'}</div>
                                                <div className="text-xs text-muted-foreground">{exp.notes}</div>
                                            </TableCell>
                                            <TableCell><Badge variant="outline">{exp.category?.name}</Badge></TableCell>
                                            <TableCell className="text-right font-bold">{formatCurrency(exp.amount)}</TableCell>
                                            <TableCell><Badge>{exp.status}</Badge></TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Catat Pengeluaran Baru</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tanggal</Label>
                                    <Input type="date" value={newExpense.expense_date} onChange={e => setNewExpense({ ...newExpense, expense_date: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Jumlah (Rp)</Label>
                                    <Input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Kategori</Label>
                                <Select onValueChange={v => setNewExpense({ ...newExpense, category_id: v })}>
                                    <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                                    <SelectContent>
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Deskripsi</Label>
                                <Input placeholder="Contoh: Bayar Listrik" value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Catatan Tambahan</Label>
                                <Input value={newExpense.notes} onChange={e => setNewExpense({ ...newExpense, notes: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit}>Simpan</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
}
