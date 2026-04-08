import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';


export default function ProductionPlanning() {
  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <CalendarRange className="h-6 w-6" /> Production Planning
            </h1>
            <p className="text-muted-foreground">Rencanakan jadwal masak berdasarkan Pesanan Pelanggan (Sales Orders)</p>
          </div>
          <Button>Tarik Data Sales Orders</Button>
        </div>



        <Card>
          <CardHeader>
             <CardTitle>Jadwal Produksi Harian</CardTitle>
             <CardDescription>Pesan material (MRP) otomatis berdasarkan rekap Sales Order.</CardDescription>
          </CardHeader>
          <CardContent className="py-12 text-center text-muted-foreground">
             Modul MRP (Material Requirement Planning) sedang dikonfigurasi. Belum ada jadwal produksi hari ini.
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
