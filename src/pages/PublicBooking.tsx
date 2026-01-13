import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, ArrowRight, QrCode, CheckCircle2, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function PublicBooking() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [showQrisDialog, setShowQrisDialog] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [bookingId, setBookingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    outlet_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    date: '',
    time: '',
  });

  // Generate time slots every 15 minutes from 09:00 to 20:00
  const allTimeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 9; hour <= 20; hour++) {
      for (let min = 0; min < 60; min += 15) {
        if (hour === 20 && min > 0) break;
        const h = hour.toString().padStart(2, '0');
        const m = min.toString().padStart(2, '0');
        slots.push(`${h}:${m}`);
      }
    }
    return slots;
  }, []);

  useEffect(() => {
    fetchOutlets();
  }, []);

  useEffect(() => {
    if (formData.outlet_id && formData.date) {
      fetchBookedSlots();
    }
  }, [formData.outlet_id, formData.date]);

  // Countdown timer for payment
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showQrisDialog && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleCancelBooking();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showQrisDialog, countdown]);

  const fetchOutlets = async () => {
    const { data } = await supabase.from('outlets').select('*').eq('is_active', true);
    setOutlets(data || []);
    if (data && data.length > 0) {
      setFormData((prev) => ({ ...prev, outlet_id: data[0].id }));
    }
  };

  const fetchBookedSlots = async () => {
    if (!formData.outlet_id || !formData.date) return;
    
    // Create date range in local time, then convert to ISO for query
    const selectedDate = new Date(formData.date);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('bookings')
      .select('slot_time, status')
      .eq('outlet_id', formData.outlet_id)
      .gte('slot_time', startOfDay.toISOString())
      .lte('slot_time', endOfDay.toISOString())
      .in('status', ['pending', 'confirmed', 'completed']);

    if (error) {
      console.error('Error fetching booked slots:', error);
      return;
    }

    // Extract time from slot_time and convert to local time
    const bookedTimes = (data || []).map((b) => {
      const d = new Date(b.slot_time);
      // Get hours and minutes in local timezone
      const hours = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      return `${hours}:${mins}`;
    });
    
    console.log('Booked slots for', formData.date, ':', bookedTimes);
    setBookedSlots(bookedTimes);
  };

  const handleCancelBooking = async () => {
    if (bookingId) {
      await supabase
        .from('bookings')
        .update({ status: 'canceled', notes: 'Auto-canceled: Payment timeout' })
        .eq('id', bookingId);
    }
    setShowQrisDialog(false);
    setBookingId(null);
    setCountdown(300);
    toast({
      title: 'Booking Dibatalkan',
      description: 'Waktu pembayaran habis. Silakan booking ulang.',
      variant: 'destructive',
    });
  };

  const getSlotAvailable = (time: string): boolean => {
    const isBooked = bookedSlots.includes(time);
    const now = new Date();
    const selectedDate = new Date(formData.date);
    const [hours, mins] = time.split(':').map(Number);
    selectedDate.setHours(hours, mins, 0, 0);
    const isPast = selectedDate < now;
    return !isBooked && !isPast;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.time) {
      toast({ title: 'Error', description: 'Pilih jam terlebih dahulu', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const selectedDate = new Date(formData.date);
      const [hours, minutes] = formData.time.split(':');
      selectedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          outlet_id: formData.outlet_id,
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone || null,
          slot_time: selectedDate.toISOString(),
          status: 'pending',
          payment_status: 'unpaid',
          payment_amount: 10000,
        })
        .select()
        .single();

      if (error) throw error;
      setBookingId(data.id);
      setCountdown(300);
      toast({ title: 'Booking Berhasil!', description: 'Bayar deposit Rp10.000 dalam 5 menit.' });
      setShowQrisDialog(true);
      fetchBookedSlots();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentConfirm = async () => {
    if (bookingId) {
      await supabase.from('bookings').update({ payment_status: 'paid' }).eq('id', bookingId);
    }
    setShowQrisDialog(false);
    setBookingId(null);
    setFormData({ outlet_id: outlets[0]?.id || '', customer_name: '', customer_email: '', customer_phone: '', date: '', time: '' });
    toast({ title: 'Terima Kasih!', description: 'Pembayaran diterima. Kami akan konfirmasi booking Anda.' });
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/Logo Long 2.png" alt="BarberDoc" className="h-8" />
            <span className="font-semibold hidden sm:inline">BarberDoc Booking</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
            Staff Login <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-1">Booking Cukur Online</h1>
            <p className="text-muted-foreground text-sm">Pilih outlet, tanggal, dan jam yang tersedia</p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {/* Booking Form */}
            <Card className="md:col-span-3">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Form Booking</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Outlet</Label>
                    <Select value={formData.outlet_id} onValueChange={(v) => setFormData({ ...formData, outlet_id: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Pilih outlet" /></SelectTrigger>
                      <SelectContent>
                        {outlets.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Nama</Label>
                      <Input placeholder="Nama lengkap" value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} required className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Email</Label>
                      <Input type="email" placeholder="email@contoh.com" value={formData.customer_email} onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })} required className="h-9" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">No. HP (opsional)</Label>
                    <Input type="tel" placeholder="08123456789" value={formData.customer_phone} onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })} className="h-9" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Tanggal</Label>
                    <Input type="date" min={new Date().toISOString().split('T')[0]} value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value, time: '' })} required className="h-9" />
                  </div>

                  {/* Time Slots Grid */}
                  {formData.date && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Pilih Jam</Label>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-primary"></div>Tersedia</span>
                          <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-muted"></div>Penuh</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 sm:grid-cols-7 gap-1 max-h-40 overflow-y-auto p-1 bg-muted/30 rounded-lg">
                        {allTimeSlots.map((slot) => {
                          const available = getSlotAvailable(slot);
                          const isSelected = formData.time === slot;
                          return (
                            <button key={slot} type="button" disabled={!available} onClick={() => setFormData({ ...formData, time: slot })}
                              className={`py-1 px-1 text-xs rounded transition-all ${!available ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' : isSelected ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-primary/10 border border-border'}`}>
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                      {formData.time && <p className="text-sm text-primary font-medium">✓ Dipilih: {formData.time}</p>}
                    </div>
                  )}

                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">Deposit</span>
                      <span className="text-xl font-bold text-primary">{formatCurrency(10000)}</span>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading || !formData.time}>
                      {loading ? 'Memproses...' : 'Booking Sekarang'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Sidebar */}
            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" />Info</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /><span>Tersedia untuk booking</span></div>
                  <div className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5 text-muted-foreground" /><span>Sudah terisi / lewat</span></div>
                  <p className="text-muted-foreground pt-1">Durasi ~30 menit per slot</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Cara Booking</CardTitle></CardHeader>
                <CardContent>
                  <ol className="text-xs space-y-1 text-muted-foreground">
                    <li><span className="font-bold text-foreground">1.</span> Isi form dan pilih waktu</li>
                    <li><span className="font-bold text-foreground">2.</span> Bayar deposit QRIS (5 menit)</li>
                    <li><span className="font-bold text-foreground">3.</span> Tunggu konfirmasi admin</li>
                    <li><span className="font-bold text-foreground">4.</span> Datang sesuai jadwal!</li>
                  </ol>
                </CardContent>
              </Card>

              {formData.date && (
                <Card className="bg-accent/5 border-accent/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-center">
                      <div><p className="text-xs text-muted-foreground">Tersedia</p><p className="text-xl font-bold text-primary">{allTimeSlots.filter(s => getSlotAvailable(s)).length}</p></div>
                      <div><p className="text-xs text-muted-foreground">Terisi</p><p className="text-xl font-bold text-muted-foreground">{bookedSlots.length}</p></div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* QRIS Dialog */}
      <Dialog open={showQrisDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><QrCode className="h-4 w-4" />Bayar QRIS</span>
              <Badge variant={countdown < 60 ? "destructive" : "secondary"} className="font-mono text-sm">{formatCountdown(countdown)}</Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">Scan dan bayar dalam {formatCountdown(countdown)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-white p-2 rounded-lg border">
              <img src="/qris_barberdoc.jpeg" alt="QRIS" className="w-full h-auto rounded max-h-52 object-contain mx-auto" />
            </div>
            <div className="bg-accent/10 p-2 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(10000)}</p>
            </div>
            {countdown < 60 && <p className="text-xs text-destructive text-center animate-pulse">⚠️ Waktu hampir habis!</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancelBooking} className="flex-1" size="sm">Batal</Button>
              <Button onClick={handlePaymentConfirm} className="flex-1" size="sm">Sudah Bayar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
