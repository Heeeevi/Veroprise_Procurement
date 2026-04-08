import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Invoices() {
  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <FileText className="h-6 w-6" /> Invoice (Outbound)
            </h1>
            <p className="text-muted-foreground">Kelola penagihan pembayaran ke klien catering</p>
          </div>
          <Button>Buat Invoice Baru</Button>
        </div>

        <Card>
          <CardHeader>
             <CardTitle>Daftar Invoice Aktif</CardTitle>
             <CardDescription>Modul penagihan masih dalam tahap dihubungkan dengan Sales Orders.</CardDescription>
          </CardHeader>
          <CardContent className="py-12 text-center text-muted-foreground">
             Belum ada data Invoice terhutang.
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
