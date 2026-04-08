import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Payments() {
  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <CreditCard className="h-6 w-6" /> Payment Entry
            </h1>
            <p className="text-muted-foreground">Catat penerimaan pembayaran dari Klien</p>
          </div>
          <Button>Terima Pembayaran</Button>
        </div>

        <Card>
          <CardHeader>
             <CardTitle>Riwayat Pembayaran</CardTitle>
             <CardDescription>Penerimaan DP, Termin, dan Pelunasan Catering.</CardDescription>
          </CardHeader>
          <CardContent className="py-12 text-center text-muted-foreground">
             Belum ada riwayat pembayaran yang di-entry.
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
