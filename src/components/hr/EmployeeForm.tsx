import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOutlet } from '@/hooks/useOutlet';
import { useToast } from '@/hooks/use-toast';
import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function EmployeeForm({ onSuccess }: { onSuccess: () => void }) {
    const { selectedOutlet } = useOutlet();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        nik: '',
        job_position: '',
        base_salary: '',
        join_date: new Date().toISOString().split('T')[0],
        status: 'active'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOutlet) return;
        setLoading(true);

        try {
            const { error } = await supabase.from('employees').insert({
                outlet_id: selectedOutlet.id,
                full_name: formData.full_name,
                nik: formData.nik,
                job_position: formData.job_position,
                base_salary: parseFloat(formData.base_salary) || 0,
                join_date: formData.join_date,
                status: formData.status
            });

            if (error) throw error;

            toast({ title: 'Success', description: 'Employee added successfully' });
            onSuccess();
            window.location.reload(); // Quick refresh to update list
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
                <DialogTitle>Tambah Karyawan Baru</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Nama Lengkap</Label>
                    <Input required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>NIK (KTP)</Label>
                    <Input value={formData.nik} onChange={e => setFormData({ ...formData, nik: e.target.value })} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Jabatan</Label>
                    <Input required value={formData.job_position} onChange={e => setFormData({ ...formData, job_position: e.target.value })} placeholder="e.g. Barista" />
                </div>
                <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Gaji Pokok</Label>
                    <Input type="number" required value={formData.base_salary} onChange={e => setFormData({ ...formData, base_salary: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>Tanggal Bergabung</Label>
                    <Input type="date" required value={formData.join_date} onChange={e => setFormData({ ...formData, join_date: e.target.value })} />
                </div>
            </div>

            <DialogFooter>
                <Button type="submit" disabled={loading}>
                    {loading ? 'Menyimpan...' : 'Simpan Karyawan'}
                </Button>
            </DialogFooter>
        </form>
    );
}
