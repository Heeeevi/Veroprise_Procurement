import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOutlet } from '@/hooks/useOutlet';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, CheckCircle } from 'lucide-react';

export default function PayrollView() {
    const { selectedOutlet } = useOutlet();
    const { toast } = useToast();
    const [runs, setRuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPeriod, setCurrentPeriod] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

    const [selectedRun, setSelectedRun] = useState<any>(null);
    const [runItems, setRunItems] = useState<any[]>([]);
    const [showDetailDialog, setShowDetailDialog] = useState(false);

    useEffect(() => {
        if (selectedOutlet) {
            fetchPayrollRuns();
        }
    }, [selectedOutlet]);

    const fetchPayrollRuns = async () => {
        const { data } = await supabase
            .from('payroll_runs')
            .select('*')
            .eq('outlet_id', selectedOutlet?.id)
            .order('period', { ascending: false });
        setRuns(data || []);
    };

    const handleGeneratePayroll = async () => {
        if (!selectedOutlet) return;
        setLoading(true);

        try {
            // 1. Check if run exists
            const { data: existing } = await supabase
                .from('payroll_runs')
                .select('id')
                .eq('outlet_id', selectedOutlet.id)
                .eq('period', currentPeriod)
                .single();

            if (existing) throw new Error(`Payroll for ${currentPeriod} already exists.`);

            // 2. Fetch Active Employees
            const { data: employees } = await supabase
                .from('employees')
                .select('*')
                .eq('outlet_id', selectedOutlet.id)
                .eq('status', 'active');

            if (!employees || employees.length === 0) throw new Error('No active employees found.');

            // 3. Create Payroll Run Header
            const totalSalary = employees.reduce((sum, e) => sum + Number(e.base_salary), 0);

            const { data: newRun, error: runError } = await supabase
                .from('payroll_runs')
                .insert({
                    outlet_id: selectedOutlet.id,
                    period: currentPeriod,
                    total_amount: totalSalary,
                    status: 'draft',
                    created_by: (await supabase.auth.getUser()).data.user?.id
                })
                .select()
                .single();

            if (runError) throw runError;

            // 4. Create Payroll Items
            const items = employees.map(emp => ({
                payroll_run_id: newRun.id,
                employee_id: emp.id,
                base_salary: emp.base_salary,
                allowances: 0,
                deductions: 0,
                net_salary: emp.base_salary
            }));

            const { error: itemsError } = await supabase.from('payroll_items').insert(items);
            if (itemsError) throw itemsError;

            toast({ title: 'Success', description: `Payroll generated for ${currentPeriod}` });
            fetchPayrollRuns();

        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (run: any) => {
        setSelectedRun(run);
        const { data } = await supabase
            .from('payroll_items')
            .select('*, employee:employees(full_name, job_position)')
            .eq('payroll_run_id', run.id);
        setRunItems(data || []);
        setShowDetailDialog(true);
    };

    const handleApproveRun = async () => {
        if (!selectedRun) return;
        try {
            await supabase.from('payroll_runs').update({ status: 'paid', processed_at: new Date().toISOString() }).eq('id', selectedRun.id);
            toast({ title: 'Paid', description: 'Payroll marked as paid' });
            setShowDetailDialog(false);
            fetchPayrollRuns();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Input
                        type="month"
                        value={currentPeriod}
                        onChange={(e) => setCurrentPeriod(e.target.value)}
                        className="w-auto"
                    />
                </div>
                <Button onClick={handleGeneratePayroll} disabled={loading}>
                    <Plus className="h-4 w-4 mr-2" />
                    {loading ? 'Generating...' : 'Generate Payroll'}
                </Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Periode</TableHead>
                        <TableHead>Total Gaji</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Dibuat Pada</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {runs.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Belum ada data payroll</TableCell></TableRow>
                    ) : (
                        runs.map(run => (
                            <TableRow key={run.id}>
                                <TableCell className="font-bold">{run.period}</TableCell>
                                <TableCell>{formatCurrency(run.total_amount)}</TableCell>
                                <TableCell>
                                    <Badge variant={run.status === 'paid' ? 'default' : 'secondary'}>
                                        {run.status.toUpperCase()}
                                    </Badge>
                                </TableCell>
                                <TableCell>{new Date(run.created_at).toLocaleDateString('id-ID')}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleViewDetail(run)}>
                                        <Eye className="h-4 w-4 mr-2" /> Detail
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* Detail Dialog */}
            <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Detail Payroll - {selectedRun?.period}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Karyawan</TableHead>
                                    <TableHead>Jabatan</TableHead>
                                    <TableHead className="text-right">Gaji Pokok</TableHead>
                                    <TableHead className="text-right">Net Salary</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {runItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.employee?.full_name}</TableCell>
                                        <TableCell>{item.employee?.job_position}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.base_salary)}</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(item.net_salary)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter className="flex justify-between sm:justify-between">
                        <p className="font-bold text-lg self-center">Total: {formatCurrency(selectedRun?.total_amount || 0)}</p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Tutup</Button>
                            {selectedRun?.status === 'draft' && (
                                <Button className="bg-green-600 hover:bg-green-700" onClick={handleApproveRun}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve & Pay
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
