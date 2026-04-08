import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';


export default function Inbound() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <Download className="h-6 w-6" /> Stock Management (Inbound)
            </h1>
            <p className="text-muted-foreground">Penerimaan barang dari Pemasok (Receiving)</p>
          </div>
          <Button onClick={() => navigate('/buying/purchase-orders')}>Cek Purchase Orders</Button>
        </div>



        <Card>
          <CardHeader>
             <CardTitle>Surat Jalan & Penerimaan</CardTitle>
             <CardDescription>Barang dalam status pengiriman.</CardDescription>
          </CardHeader>
          <CardContent className="py-12 text-center text-muted-foreground">
             Saat ini fitur penerimaan langsung digabungkan pada layar Purchase Orders. Silakan buka menu PO dan klik Terima Barang untuk mutasi otomatis.
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
