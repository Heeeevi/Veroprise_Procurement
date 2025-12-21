import { useState, useEffect, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOutlet } from '@/hooks/useOutlet';
import { useShift } from '@/hooks/useShift';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Search, Plus, Minus, Trash2, ShoppingBag, CreditCard, Banknote, QrCode, Clock } from 'lucide-react';
import type { Product, Category, CartItem, PaymentMethod } from '@/types/database';

export default function POS() {
  const { user } = useAuth();
  const { selectedOutlet } = useOutlet();
  const { currentShift, startShift, endShift } = useShift();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showEndShiftDialog, setShowEndShiftDialog] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('products').select('*').eq('is_active', true).order('name'),
      ]);
      
      setCategories((catRes.data || []) as unknown as Category[]);
      setProducts((prodRes.data || []) as unknown as Product[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = 0; // Can be configured
  const total = subtotal + tax;

  const handleStartShift = async () => {
    const cash = parseFloat(openingCash) || 0;
    const success = await startShift(cash);
    if (success) {
      setShowShiftDialog(false);
      setOpeningCash('');
    }
  };

  const handleEndShift = async () => {
    const cash = parseFloat(closingCash) || 0;
    const success = await endShift(cash);
    if (success) {
      setShowEndShiftDialog(false);
      setClosingCash('');
    }
  };

  const handlePayment = async () => {
    if (!user || !selectedOutlet || !currentShift) {
      toast({ title: 'Error', description: 'Pastikan shift sudah dimulai', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      // Create transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          outlet_id: selectedOutlet.id,
          shift_id: currentShift.id,
          user_id: user.id,
          subtotal,
          tax,
          total,
          payment_method: paymentMethod,
          transaction_number: 'TEMP', // Will be generated by trigger
        })
        .select()
        .single();

      if (txError) throw txError;

      // Create transaction items
      const items = cart.map((item) => ({
        transaction_id: transaction.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        cost_price: item.product.cost_price,
        subtotal: item.product.price * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('transaction_items').insert(items);
      if (itemsError) throw itemsError;

      toast({ title: 'Sukses!', description: `Transaksi ${transaction.transaction_number} berhasil` });
      setCart([]);
      setShowPaymentDialog(false);
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // Show shift start dialog if no active shift
  if (!currentShift && selectedOutlet) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[80vh] p-6">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <Clock className="h-12 w-12 mx-auto text-primary mb-4" />
              <CardTitle className="font-display">Mulai Shift</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                Anda perlu memulai shift sebelum dapat melakukan transaksi.
              </p>
              <div className="space-y-2">
                <Label>Kas Awal (Rp)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleStartShift}>
                Mulai Shift
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-4rem)] lg:h-screen">
        {/* Products Section */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Search & Categories */}
          <div className="space-y-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="whitespace-nowrap"
              >
                Semua
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="whitespace-nowrap"
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="pos-btn-product text-left"
                >
                  <div className="w-full">
                    <p className="font-medium line-clamp-2">{product.name}</p>
                    <p className="text-primary font-semibold mt-1">{formatCurrency(product.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-full md:w-96 bg-card border-l border-border flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Keranjang
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowEndShiftDialog(true)}>
              Akhiri Shift
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Keranjang kosong</p>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="bg-muted/50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium flex-1">{item.product.name}</p>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-destructive p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, -1)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.product.price * item.quantity)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-border space-y-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-sm">
                <span>Pajak</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg border-t border-border pt-3">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <Button 
              className="w-full h-14 text-lg" 
              disabled={cart.length === 0}
              onClick={() => setShowPaymentDialog(true)}
            >
              Bayar
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Metode Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-2xl font-bold text-center mb-6">{formatCurrency(total)}</p>
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="space-y-3">
              <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="cash" />
                <Banknote className="h-5 w-5" />
                <span className="font-medium">Cash</span>
              </label>
              <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="qris" />
                <QrCode className="h-5 w-5" />
                <span className="font-medium">QRIS</span>
              </label>
              <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="transfer" />
                <CreditCard className="h-5 w-5" />
                <span className="font-medium">Transfer Bank</span>
              </label>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Batal</Button>
            <Button onClick={handlePayment} disabled={processing}>
              {processing ? 'Memproses...' : 'Konfirmasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Shift Dialog */}
      <Dialog open={showEndShiftDialog} onOpenChange={setShowEndShiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Akhiri Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Kas Akhir (Rp)</Label>
              <Input
                type="number"
                placeholder="0"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndShiftDialog(false)}>Batal</Button>
            <Button onClick={handleEndShift}>Akhiri Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
