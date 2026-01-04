import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { useOutlet } from '@/hooks/useOutlet';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function EmployeeList() {
    const { selectedOutlet } = useOutlet();
    const [employees, setEmployees] = useState<any[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        if (selectedOutlet) {
            fetchEmployees();
        }
    }, [selectedOutlet]);

    const fetchEmployees = async () => {
        const { data } = await supabase
            .from('employees')
            .select('*')
            .eq('outlet_id', selectedOutlet?.id)
            .order('full_name');
        setEmployees(data || []);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this employee?')) return;

        const { error } = await supabase.from('employees').delete().eq('id', id);
        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: 'Employee deleted' });
            fetchEmployees();
        }
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>NIK</TableHead>
                    <TableHead>Gaji Pokok</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {employees.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Belum ada data karyawan</TableCell></TableRow>
                ) : (
                    employees.map((emp) => (
                        <TableRow key={emp.id}>
                            <TableCell className="font-medium">{emp.full_name}</TableCell>
                            <TableCell>{emp.job_position}</TableCell>
                            <TableCell>{emp.nik || '-'}</TableCell>
                            <TableCell>{formatCurrency(emp.base_salary)}</TableCell>
                            <TableCell>
                                <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                                    {emp.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}
