import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, Banknote, UserPlus, Target, FileSpreadsheet, ChevronDown, Plus } from 'lucide-react';
import EmployeeList from '@/components/hr/EmployeeList';
import AttendanceView from '@/components/hr/AttendanceView';
import PayrollView from '@/components/hr/PayrollView';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import EmployeeForm from '@/components/hr/EmployeeForm';
import HRBonusView from '@/components/hr/HRBonusView';
import BulkImportDialog from '@/components/BulkImportDialog';
import { supabase } from '@/integrations/supabase/client';
import { useOutlet } from '@/hooks/useOutlet';

export default function HRPage() {
    const [activeTab, setActiveTab] = useState('employees');
    const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const { selectedOutlet } = useOutlet();

    return (
        <MainLayout>
            <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="font-display text-2xl font-semibold">HR & Payroll</h1>
                        <p className="text-muted-foreground">Kelola karyawan, absensi, dan penggajian</p>
                    </div>
                    {activeTab === 'employees' && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Tambah Karyawan
                                    <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-60" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsAddEmployeeOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Tambah Satuan
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setShowBulkImport(true)}>
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    Bulk Import (XLSX)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
                        <DialogContent className="max-w-xl">
                            <EmployeeForm onSuccess={() => setIsAddEmployeeOpen(false)} />
                        </DialogContent>
                    </Dialog>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="employees" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Karyawan
                        </TabsTrigger>
                        <TabsTrigger value="attendance" className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Absensi
                        </TabsTrigger>
                        <TabsTrigger value="payroll" className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            Payroll
                        </TabsTrigger>
                        <TabsTrigger value="bonus" className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Bonus & Target
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="employees">
                        <Card>
                            <CardHeader>
                                <CardTitle>Data Karyawan</CardTitle>
                                <CardDescription>Daftar semua karyawan aktif dan non-aktif</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <EmployeeList />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="attendance">
                        <Card>
                            <CardHeader>
                                <CardTitle>Log Absensi</CardTitle>
                                <CardDescription>Riwayat kehadiran karyawan</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AttendanceView />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="payroll">
                        <Card>
                            <CardHeader>
                                <CardTitle>Penggajian</CardTitle>
                                <CardDescription>Kelola gaji dan slip gaji bulanan</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <PayrollView />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="bonus">
                        <HRBonusView />
                    </TabsContent>
                </Tabs>

                {/* Bulk Import Dialog */}
                <BulkImportDialog
                    open={showBulkImport}
                    onOpenChange={setShowBulkImport}
                    config={{
                        entityName: 'Karyawan',
                        templateFileName: 'template_karyawan.xlsx',
                        columns: [
                            { key: 'full_name', label: 'Nama Lengkap', type: 'text', required: true, description: 'Nama karyawan (WAJIB)' },
                            { key: 'position', label: 'Jabatan', type: 'text', required: true, description: 'Jabatan karyawan (WAJIB)' },
                            { key: 'phone', label: 'No. Telepon', type: 'text', required: true, description: '08xxx (WAJIB)' },
                            { key: 'address', label: 'Alamat', type: 'text', required: false, description: 'Alamat lengkap' },
                            { key: 'basic_salary', label: 'Gaji Pokok', type: 'number', required: false, description: 'Gaji pokok (angka)', defaultValue: 0 },
                            { key: 'hire_date', label: 'Tanggal Bergabung', type: 'date', required: false, description: 'YYYY-MM-DD', defaultValue: new Date().toISOString().split('T')[0] },
                            { key: 'is_active', label: 'Status Aktif', type: 'boolean', required: false, description: 'Ya / Tidak', defaultValue: 'Ya', options: ['Ya', 'Tidak'] },
                        ],
                        onImport: async (rows) => {
                            let success = 0;
                            let failed = 0;
                            const errors: string[] = [];

                            if (!selectedOutlet) {
                                return { success: 0, failed: rows.length, errors: ['Outlet belum dipilih'] };
                            }

                            for (const row of rows) {
                                try {
                                    const code = 'EMP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase();
                                    const { error } = await supabase.from('employees').insert({
                                        outlet_id: selectedOutlet.id,
                                        employee_code: code,
                                        full_name: String(row.full_name),
                                        phone: String(row.phone),
                                        address: row.address ? String(row.address) : null,
                                        position: String(row.position),
                                        basic_salary: parseFloat(row.basic_salary) || 0,
                                        hire_date: row.hire_date || new Date().toISOString().split('T')[0],
                                        is_active: String(row.is_active).toLowerCase() !== 'tidak',
                                    });

                                    if (error) throw error;
                                    success++;
                                } catch (err: any) {
                                    failed++;
                                    errors.push(`Karyawan "${row.full_name}": ${err.message}`);
                                }
                            }

                            if (success > 0) window.location.reload();
                            return { success, failed, errors };
                        },
                    }}
                />
            </div>
        </MainLayout>
    );
}
