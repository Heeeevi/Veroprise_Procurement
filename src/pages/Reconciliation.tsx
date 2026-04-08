import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useNavigate } from 'react-router-dom';

export default function Reconciliation() {
  const navigate = useNavigate();
  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <Scale className="h-6 w-6" /> Stock Reconcilliation
            </h1>
            <p className="text-muted-foreground">Koreksi perbedaan stok fisik vs data sistem</p>
          </div>
          <Button onClick={() => navigate('/stock/tracking')}>Lakukan Stock Opname</Button>
        </div>



        <Card>
          <CardHeader>
             <CardTitle>Riwayat Penyesuaian</CardTitle>
             <CardDescription>Catatan selisih barang masuk/keluar di luar transaksi produksi.</CardDescription>
          </CardHeader>
          <CardContent className="py-12 text-center text-muted-foreground">
             Anda bisa melakukan penyesuaian (Add Stock / Subtract) langsung melalui menu Inventory Tracking. Rekap penyesuaian khusus akan segera terpusat di sini.
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
