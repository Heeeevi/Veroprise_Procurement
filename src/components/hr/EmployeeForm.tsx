import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useOutlet } from '@/hooks/useOutlet';
import { useToast } from '@/hooks/use-toast';
import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function EmployeeForm({ onSuccess }: { onSuccess: () => void }) {
    const { selectedOutlet } = useOutlet();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        address: '',
        position: '',
        basic_salary: '',
        hire_date: new Date().toISOString().split('T')[0],
        is_active: true
    });

    const generateEmployeeCode = () => {
        const timestamp = Date.now().toString(36).toUpperCase();
        return `EMP-${timestamp}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOutlet) {
            toast({ title: 'Error', description: 'Pilih outlet terlebih dahulu dari sidebar', variant: 'destructive' });
            return;
        }

        if (!formData.full_name || !formData.phone || !formData.position) {
            toast({ title: 'Error', description: 'Nama, telepon, dan jabatan wajib diisi', variant: 'destructive' });
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.from('employees').insert({
                outlet_id: selectedOutlet.id,
                employee_code: generateEmployeeCode(),
                full_name: formData.full_name,
                phone: formData.phone,
                address: formData.address || null,
                position: formData.position,
                basic_salary: parseFloat(formData.basic_salary) || 0,
                hire_date: formData.hire_date,
                is_active: formData.is_active
            });

            if (error) throw error;

            toast({ title: 'Success', description: 'Karyawan berhasil ditambahkan' });
            onSuccess();
            window.location.reload();
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
                    <Label>Nama Lengkap *</Label>
                    <Input required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>No. Telepon *</Label>
                    <Input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="08123456789" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Jabatan *</Label>
                    <Input required value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} placeholder="e.g. Operational, Kasir" />
                </div>
                <div className="space-y-2">
                    <Label>Gaji Pokok</Label>
                    <Input type="number" value={formData.basic_salary} onChange={e => setFormData({ ...formData, basic_salary: e.target.value })} placeholder="0" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Tanggal Bergabung</Label>
                    <Input type="date" required value={formData.hire_date} onChange={e => setFormData({ ...formData, hire_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                    <Label>Alamat</Label>
                    <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Alamat karyawan" />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <Label>Status Aktif</Label>
                <Switch checked={formData.is_active} onCheckedChange={v => setFormData({ ...formData, is_active: v })} />
            </div>

            <DialogFooter>
                <Button type="submit" disabled={loading}>
                    {loading ? 'Menyimpan...' : 'Simpan Karyawan'}
                </Button>
            </DialogFooter>
        </form>
    );
}
