import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function ComingSoon() {
  const location = useLocation();
  const pathName = location.pathname.split('/').filter(Boolean).map(segment => 
    segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ')
  ).join(' > ');

  return (
    <MainLayout>
      <div className="p-6 h-full flex flex-col items-center justify-center">
        <Card className="max-w-md w-full border-dashed border-2">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Construction className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">Fitur dalam Pengembangan</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p className="mb-4">
              Modul <strong className="text-foreground">{pathName || 'Baru'}</strong> saat ini sedang dalam tahap pengembangan dan akan segera hadir.
            </p>
            <p className="text-sm">
              Untuk sementara waktu, halaman ini difungsikan sebagai placeholder untuk struktur tata letak baru.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
