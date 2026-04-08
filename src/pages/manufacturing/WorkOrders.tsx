import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';


export default function WorkOrders() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <ClipboardList className="h-6 w-6" /> Work Orders (Summary)
            </h1>
            <p className="text-muted-foreground">Ringkasan daftar Perintah Kerja yang diterbitkan</p>
          </div>
          <Button onClick={() => navigate('/manufacturing/job-cards')}>Buka Job Cards Eksekusi</Button>
        </div>



        <Card>
          <CardHeader>
             <CardTitle>Arsip Eksekusi</CardTitle>
             <CardDescription>Semua Work Orders untuk evaluasi Manajer.</CardDescription>
          </CardHeader>
          <CardContent className="py-12 text-center text-muted-foreground">
             Dashboard pelaporan WO sedang disempurnakan. Silakan gunakan menu Job Cards untuk operasional utama Dapur.
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
