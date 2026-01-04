import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, Banknote, UserPlus } from 'lucide-react';
import EmployeeList from '@/components/hr/EmployeeList';
import AttendanceView from '@/components/hr/AttendanceView';
import PayrollView from '@/components/hr/PayrollView';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import EmployeeForm from '@/components/hr/EmployeeForm';

export default function HRPage() {
    const [activeTab, setActiveTab] = useState('employees');
    const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);

    return (
        <MainLayout>
            <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="font-display text-2xl font-semibold">HR & Payroll</h1>
                        <p className="text-muted-foreground">Kelola karyawan, absensi, dan penggajian</p>
                    </div>
                    {activeTab === 'employees' && (
                        <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Tambah Karyawan
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl">
                                <EmployeeForm onSuccess={() => setIsAddEmployeeOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    )}
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
                </Tabs>
            </div>
        </MainLayout>
    );
}
