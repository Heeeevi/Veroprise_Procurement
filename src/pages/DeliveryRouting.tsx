import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Truck, MapPin, Plus, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DeliveryRouting() {
  const [fleets, setFleets] = useState([
    { id: 1, name: 'Mobil Box A (B5432)', status: 'Available', temp: 'Siap (12°C)' },
    { id: 2, name: 'GrandMax B (B9091)', status: 'On Route', temp: 'Monitoring (8°C)' }
  ]);

  const [showDialog, setShowDialog] = useState(false);
  const [newFleet, setNewFleet] = useState({ name: '', temp: '' });

  const handleAddFleet = () => {
    if (!newFleet.name) return;
    setFleets([...fleets, { id: Date.now(), name: newFleet.name, status: 'Available', temp: newFleet.temp || 'Monitoring...' }]);
    setShowDialog(false);
    setNewFleet({ name: '', temp: '' });
  };

  const toggleStatus = (id: number) => {
    setFleets(fleets.map(f => {
      if (f.id === id) {
        return { ...f, status: f.status === 'Available' ? 'On Route' : 'Available' };
      }
      return f;
    }));
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <Truck className="h-6 w-6" /> Delivery & Route Planning
            </h1>
            <p className="text-muted-foreground">Optimasi Logistik & Pengiriman berdasarkan klaster lokasi (Routing)</p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Jadwalkan Kurir Baru
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Klaster Antaran Hari Ini</CardTitle>
                <CardDescription>Order siap kirim yang telah dibundel berdasarkan zona radius untuk menghemat bahan bakar.</CardDescription>
              </CardHeader>
              <CardContent className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground">
                <MapPin className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p>Belum ada jadwal Delivery Order aktif hari ini.</p>
                <p className="text-sm mt-2">Nantinya SO yang telah selesai diproduksi akan ditarik ke sini dan diklasterisasi otomatis berdasarkan kodepos / area tempuh.</p>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Armada & Suhu</CardTitle>
                <CardDescription>Bisa diklik untuk ubah status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                {fleets.length === 0 ? (
                  <p className="text-center py-4">Belum ada armada.</p>
                ) : (
                  fleets.map((fleet) => (
                    <div key={fleet.id} className="border-b pb-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors" onClick={() => toggleStatus(fleet.id)}>
                      <div className="flex justify-between font-medium text-foreground">
                        <span>{fleet.name}</span>
                        <span className={fleet.status === 'Available' ? "text-green-600 font-bold" : "text-blue-600 font-bold"}>{fleet.status}</span>
                      </div>
                      <div className="flex justify-between mt-1 text-xs items-center">
                        <span className="flex items-center"><Thermometer className="w-3 h-3 mr-1" /> Thermal Box:</span>
                        <span>{fleet.temp}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Jadwalkan Kendaraan & Kurir</DialogTitle>
              <DialogDescription>Tambahkan armada untuk mengangkut batch produksi (Sales Orders) yang sudah matang.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Kendaraan / Plat</Label>
                <Input placeholder="cth: L300 (B8819)" value={newFleet.name} onChange={(e) => setNewFleet({...newFleet, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Catatan Suhu Thermal Box</Label>
                <Input placeholder="cth: Target 10°C" value={newFleet.temp} onChange={(e) => setNewFleet({...newFleet, temp: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button onClick={handleAddFleet}>Simpan Armada</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </MainLayout>
  );
}
