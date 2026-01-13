import { useState, useEffect, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useOutlet } from '@/hooks/useOutlet';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Calendar, Clock, Search, CheckCircle, XCircle, DollarSign, User, AlertCircle, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Booking } from '@/types/database';

export default function Bookings() {
  const { selectedOutlet } = useOutlet();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (selectedOutlet) {
      fetchBookings();
    }
  }, [selectedOutlet, statusFilter]);

  const fetchBookings = async () => {
    if (!selectedOutlet) return;

    try {
      setLoading(true);
      // Simplified query - remove problematic joins
      let query = supabase
        .from('bookings')
        .select('*')
        .eq('outlet_id', selectedOutlet.id)
        .order('slot_time', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching bookings:', error);
        toast({ title: 'Error', description: `Gagal memuat booking: ${error.message}`, variant: 'destructive' });
      } else {
        setBookings((data || []) as unknown as Booking[]);
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      toast({ title: 'Error', description: err.message || 'Terjadi kesalahan', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async (booking: Booking) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        toast({ title: 'Error', description: 'User tidak ditemukan', variant: 'destructive' });
        return;
      }

      // Create transaction record
      const transactionNumber = `BK-${Date.now()}`;
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          outlet_id: booking.outlet_id,
          user_id: user.data.user.id,
          transaction_number: transactionNumber,
          subtotal: booking.payment_amount,
          discount: 0,
          tax: 0,
          total: booking.payment_amount,
          payment_method: booking.payment_method || 'qris',
          notes: `Booking: ${booking.customer_name} - ${notes}`,
        })
        .select()
        .single();

      if (txError) throw txError;

      // Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'completed',
          payment_status: 'paid',
          confirmed_by: user.data.user.id,
          confirmed_at: new Date().toISOString(),
          transaction_id: transaction.id,
          notes: notes || booking.notes,
        })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      toast({ title: 'Berhasil', description: 'Booking dikonfirmasi dan transaksi tercatat' });
      setConfirmDialogOpen(false);
      setSelectedBooking(null);
      setNotes('');
      fetchBookings();
    } catch (error: any) {
      console.error('Error confirming booking:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'canceled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({ title: 'Berhasil', description: 'Booking dibatalkan' });
      fetchBookings();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', label: 'Menunggu' },
      confirmed: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'Dikonfirmasi' },
      completed: { color: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'Selesai' },
      canceled: { color: 'bg-red-500/10 text-red-500 border-red-500/20', label: 'Batal' },
    };
    const variant = variants[status] || variants.pending;
    return (
      <Badge className={`${variant.color} border`} variant="outline">
        {variant.label}
      </Badge>
    );
  };

  const getPaymentBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      unpaid: { color: 'bg-gray-500/10 text-gray-500', label: 'Belum Bayar' },
      paid: { color: 'bg-green-500/10 text-green-500', label: 'Lunas' },
      refunded: { color: 'bg-orange-500/10 text-orange-500', label: 'Refund' },
    };
    const variant = variants[status] || variants.unpaid;
    return <Badge className={variant.color}>{variant.label}</Badge>;
  };

  const filteredBookings = bookings.filter(
    (booking) =>
      booking.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customer_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get today's bookings sorted by time (upcoming first)
  const todayBookings = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    return bookings
      .filter((b) => {
        const slotTime = new Date(b.slot_time);
        return slotTime >= todayStart && slotTime <= todayEnd && b.status !== 'canceled';
      })
      .sort((a, b) => new Date(a.slot_time).getTime() - new Date(b.slot_time).getTime());
  }, [bookings]);

  // Get upcoming bookings (from now onwards today)
  const upcomingTodayBookings = useMemo(() => {
    const now = new Date();
    return todayBookings.filter((b) => new Date(b.slot_time) >= now);
  }, [todayBookings]);

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    revenue: bookings
      .filter((b) => b.payment_status === 'paid')
      .reduce((sum, b) => sum + Number(b.payment_amount), 0),
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-semibold">Booking Cukur</h1>
          <p className="text-muted-foreground">Kelola reservasi pelanggan</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Booking</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selesai</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.revenue)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Bookings Section */}
        {todayBookings.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Booking Hari Ini</CardTitle>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {todayBookings.length} booking • {upcomingTodayBookings.length} akan datang
                </Badge>
              </div>
              <CardDescription>
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {todayBookings.map((booking) => {
                  const slotTime = new Date(booking.slot_time);
                  const now = new Date();
                  const isPast = slotTime < now;
                  const isUpcoming = !isPast && slotTime.getTime() - now.getTime() < 60 * 60 * 1000; // within 1 hour
                  
                  return (
                    <div 
                      key={booking.id} 
                      className={`p-3 rounded-lg border ${
                        isPast 
                          ? 'bg-muted/50 border-muted' 
                          : isUpcoming 
                            ? 'bg-yellow-500/10 border-yellow-500/30 ring-2 ring-yellow-500/20' 
                            : 'bg-card border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className={`h-4 w-4 ${isPast ? 'text-muted-foreground' : isUpcoming ? 'text-yellow-500' : 'text-primary'}`} />
                          <span className={`font-bold text-lg ${isPast ? 'text-muted-foreground' : ''}`}>
                            {slotTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {getStatusBadge(booking.status)}
                      </div>
                      <div className={isPast ? 'text-muted-foreground' : ''}>
                        <p className="font-medium truncate">{booking.customer_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{booking.customer_email}</p>
                        {booking.customer_phone && (
                          <a 
                            href={`https://wa.me/${booking.customer_phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo ${booking.customer_name}, booking Anda di BarberDoc untuk ${slotTime.toLocaleDateString('id-ID')} jam ${slotTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} telah dikonfirmasi. Ditunggu kedatangannya!`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {booking.customer_phone}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t">
                        {getPaymentBadge(booking.payment_status)}
                        {isUpcoming && !isPast && (
                          <span className="text-xs text-yellow-600 font-medium animate-pulse">⏰ Segera!</span>
                        )}
                        {isPast && booking.status !== 'completed' && (
                          <span className="text-xs text-muted-foreground">Lewat</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {todayBookings.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Tidak ada booking hari ini</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau email..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Menunggu</SelectItem>
                  <SelectItem value="confirmed">Dikonfirmasi</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                  <SelectItem value="canceled">Batal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Memuat...
                    </TableCell>
                  </TableRow>
                ) : filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Tidak ada booking
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{booking.customer_name}</div>
                          <div className="text-sm text-muted-foreground">{booking.customer_email}</div>
                          {booking.customer_phone && (
                            <a 
                              href={`https://wa.me/${booking.customer_phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo ${booking.customer_name}, terima kasih telah booking di BarberDoc! Booking Anda untuk ${new Date(booking.slot_time).toLocaleDateString('id-ID')} jam ${new Date(booking.slot_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} telah kami terima.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 hover:underline mt-1"
                            >
                              <Phone className="h-3 w-3" />
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDateTime(booking.slot_time)}</TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell>{getPaymentBadge(booking.payment_status)}</TableCell>
                      <TableCell>{formatCurrency(booking.payment_amount)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {booking.status === 'pending' && (
                            <>
                              <Dialog
                                open={confirmDialogOpen && selectedBooking?.id === booking.id}
                                onOpenChange={(open) => {
                                  setConfirmDialogOpen(open);
                                  if (open) setSelectedBooking(booking);
                                  else {
                                    setSelectedBooking(null);
                                    setNotes('');
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="default">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Konfirmasi
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Konfirmasi Booking</DialogTitle>
                                    <DialogDescription>
                                      Konfirmasi booking dari {booking.customer_name}? Transaksi akan tercatat di
                                      laporan keuangan.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>Catatan (opsional)</Label>
                                      <Textarea
                                        placeholder="Tambahkan catatan untuk booking ini..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                                      Batal
                                    </Button>
                                    <Button onClick={() => handleConfirmBooking(booking)}>Konfirmasi</Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleCancelBooking(booking.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {booking.status === 'completed' && (
                            <Badge variant="outline" className="text-xs">
                              <User className="h-3 w-3 mr-1" />
                              {booking.confirmer?.full_name || 'Admin'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
