import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOutlet } from '@/hooks/useOutlet';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AttendanceView() {
    const { selectedOutlet } = useOutlet();
    const { toast } = useToast();
    const [logs, setLogs] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

    const [showLogDialog, setShowLogDialog] = useState(false);
    const [newLog, setNewLog] = useState({
        employee_id: '',
        status: 'present',
        clock_in: '',
        clock_out: '',
        notes: ''
    });

    useEffect(() => {
        if (selectedOutlet) {
            fetchLogs();
            fetchEmployees();
        }
    }, [selectedOutlet, dateFilter]);

    const fetchLogs = async () => {
        const { data } = await (supabase as any)
            .from('attendances')
            .select('*, employee:employees(full_name)')
            .eq('outlet_id', selectedOutlet?.id)
            .eq('attendance_date', dateFilter)
            .order('created_at', { ascending: false });
        setLogs(data || []);
    };

    const fetchEmployees = async () => {
        const { data } = await supabase
            .from('employees')
            .select('id, full_name')
            .eq('outlet_id', selectedOutlet?.id)
            .eq('is_active', true);
        setEmployees(data || []);
    };

    const handleSubmit = async () => {
        if (!newLog.employee_id) return;

        try {
            const { error } = await (supabase as any).from('attendances').insert({
                outlet_id: selectedOutlet?.id,
                employee_id: newLog.employee_id,
                attendance_date: dateFilter,
                status: newLog.status,
                check_in: newLog.clock_in ? `${dateFilter}T${newLog.clock_in}:00` : null,
                check_out: newLog.clock_out ? `${dateFilter}T${newLog.clock_out}:00` : null,
                notes: newLog.notes
            });

            if (error) throw error;
            toast({ title: 'Success', description: 'Attendance logged' });
            setShowLogDialog(false);
            fetchLogs();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-auto"
                    />
                </div>
                <Button onClick={() => setShowLogDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Log Kehadiran
                </Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nama Karyawan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Jam Masuk</TableHead>
                        <TableHead>Jam Pulang</TableHead>
                        <TableHead>Catatan</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Belum ada data absensi untuk tanggal ini</TableCell></TableRow>
                    ) : (
                        logs.map(log => (
                            <TableRow key={log.id}>
                                <TableCell className="font-medium">{log.employee?.full_name}</TableCell>
                                <TableCell>
                                    <Badge variant={log.status === 'present' ? 'default' : log.status === 'late' ? 'secondary' : 'destructive'}>
                                        {log.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{log.check_in ? new Date(log.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                                <TableCell>{log.check_out ? new Date(log.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                                <TableCell>{log.notes || '-'}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Log Kehadiran Manual</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Karyawan</Label>
                            <Select onValueChange={(v) => setNewLog({ ...newLog, employee_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Pilih Karyawan" /></SelectTrigger>
                                <SelectContent>
                                    {employees.map(e => (
                                        <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={newLog.status} onValueChange={(v) => setNewLog({ ...newLog, status: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="present">Hadir</SelectItem>
                                    <SelectItem value="late">Terlambat</SelectItem>
                                    <SelectItem value="sick">Sakit</SelectItem>
                                    <SelectItem value="leave">Cuti</SelectItem>
                                    <SelectItem value="absent">Alpha</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Jam Masuk</Label>
                                <Input type="time" onChange={e => setNewLog({ ...newLog, clock_in: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Jam Pulang</Label>
                                <Input type="time" onChange={e => setNewLog({ ...newLog, clock_out: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Catatan</Label>
                            <Input onChange={e => setNewLog({ ...newLog, notes: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSubmit}>Simpan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
