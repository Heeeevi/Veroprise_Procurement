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
import { Search, Plus, Minus, Trash2, ShoppingBag, CreditCard, Banknote, QrCode, Clock, Store, Split } from 'lucide-react';
import { ReceiptPrinter, type ReceiptData } from '@/components/receipt';
import type { Product, Category, CartItem, PaymentMethod } from '@/types/database';
import { Checkbox } from '@/components/ui/checkbox';

interface PaymentSplit {
  method: PaymentMethod | 'olshop';
  amount: number;
}

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'olshop'>('cash');
  const [processing, setProcessing] = useState(false);

  // Multi-payment support
  const [isMultiPayment, setIsMultiPayment] = useState(false);
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([]);
  const [currentSplitAmount, setCurrentSplitAmount] = useState('');

  // Tax rate (percentage, default 0)
  const [taxRate, setTaxRate] = useState<number>(0);

  // Cash payment - amount received and change
  const [cashReceived, setCashReceived] = useState<string>('');

  // Receipt printer state
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

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

  const setQuantity = (productId: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = subtotal * (taxRate / 100); // Calculate tax based on tax rate percentage
  const total = subtotal + tax;
  const cashChange = paymentMethod === 'cash' && cashReceived ? (parseFloat(cashReceived) || 0) - total : 0;

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

    // Validate multi-payment total
    if (isMultiPayment) {
      const paidTotal = paymentSplits.reduce((sum, s) => sum + s.amount, 0);
      if (paidTotal < total) {
        toast({ title: 'Error', description: 'Total pembayaran belum mencukupi', variant: 'destructive' });
        return;
      }
    }

    setProcessing(true);
    try {
      // Generate unique transaction number: TRX-YYYYMMDD-HHMMSS-RANDOM
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      const transactionNumber = `TRX-${dateStr}-${timeStr}-${randomStr}`;

      // Prepare payment data
      // Don't use 'split' as payment_method - use the first method in splits or 'cash'
      const finalPaymentMethod = isMultiPayment
        ? (paymentSplits.length > 0 ? paymentSplits[0].method : 'cash')
        : paymentMethod;
      const paymentDetails = isMultiPayment
        ? paymentSplits
        : [{ method: paymentMethod, amount: total }];

      // Create transaction
      const transactionData = {
        outlet_id: selectedOutlet.id,
        shift_id: currentShift.id,
        created_by: user.id,
        subtotal,
        tax,
        total,
        payment_method: finalPaymentMethod,
        payment_details: paymentDetails,
        is_split_payment: isMultiPayment,
        transaction_number: transactionNumber,
      };

      let transactionResult = await (supabase as any)
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (transactionResult.error && String(transactionResult.error.message || '').toLowerCase().includes('shift_id')) {
        console.warn('Retrying transaction insert without shift_id because the column is not available yet.');
        const { shift_id: _shiftId, ...fallbackTransactionData } = transactionData;
        transactionResult = await (supabase as any)
          .from('transactions')
          .insert(fallbackTransactionData)
          .select()
          .single();
      }

      const { data: transaction, error: txError } = transactionResult;

      if (txError) throw txError;

      // Create transaction items
      const items = cart.map((item) => ({
        transaction_id: transaction.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        subtotal: item.product.price * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('transaction_items').insert(items);
      if (itemsError) throw itemsError;

      // Deduct inventory based on product recipes
      const { error: inventoryError } = await supabase.rpc('deduct_inventory_for_sale', {
        p_transaction_id: transaction.id,
        p_outlet_id: selectedOutlet.id,
        p_user_id: user.id
      });

      if (inventoryError) {
        console.warn('Inventory deduction warning:', inventoryError.message);
        // Don't fail transaction if inventory deduction fails - products may not have recipes
      }

      toast({ title: 'Sukses!', description: `Transaksi ${transaction.transaction_number} berhasil` });

      // Prepare receipt data for printing
      const receiptItems = cart.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        subtotal: item.product.price * item.quantity,
      }));

      const newReceiptData: ReceiptData = {
        transactionNumber: transaction.transaction_number,
        transactionDate: transaction.created_at || new Date().toISOString(),
        outlet: {
          name: selectedOutlet.name,
          address: selectedOutlet.address || '',
          phone: selectedOutlet.phone || '',
        },
        items: receiptItems,
        subtotal,
        tax,
        taxRate,
        discount: 0,
        total,
        payments: [{
          method: finalPaymentMethod,
          amount: total,
        }],
        cashReceived: paymentMethod === 'cash' ? parseFloat(cashReceived) || 0 : undefined,
        change: paymentMethod === 'cash' ? cashChange : undefined,
        cashierName: user.email || undefined,
        receiptFooter: 'Terima kasih atas kunjungan Anda!',
      };

      setReceiptData(newReceiptData);
      setCart([]);
      setCashReceived('');
      setShowPaymentDialog(false);
      setShowReceiptDialog(true); // Show receipt dialog
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // Show outlet selection prompt if no outlet selected
  if (!selectedOutlet) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[80vh] p-6">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="font-display">Pilih Outlet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                Silakan pilih outlet terlebih dahulu di dropdown outlet pada sidebar untuk memulai transaksi.
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Jika tidak ada outlet yang tersedia, hubungi administrator untuk menambahkan outlet.
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Show shift start dialog if no active shift
  if (!currentShift) {
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
                Anda perlu memulai shift sebelum dapat melakukan transaksi di outlet <strong>{selectedOutlet.name}</strong>.
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
      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden min-w-0">
          {/* Search & Categories */}
          <div className="space-y-3 mb-4 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Category filter - wrap to multiple lines */}
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="h-7 text-xs px-2"
              >
                Semua
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="h-7 text-xs px-2"
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Products Grid - Fixed 3 columns */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-card hover:bg-accent/50 border border-border rounded-lg p-3 text-left transition-colors"
                >
                  <p className="font-medium text-sm line-clamp-2 mb-1">{product.name}</p>
                  <p className="text-primary font-semibold">{formatCurrency(product.price)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Section - Fixed width on desktop */}
        <div className="w-full lg:w-80 xl:w-96 bg-card border-t lg:border-t-0 lg:border-l border-border flex flex-col flex-shrink-0 max-h-[50vh] lg:max-h-full">
          <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
            <h2 className="font-display font-semibold flex items-center gap-2 text-sm">
              <ShoppingBag className="h-4 w-4" />
              Keranjang ({cart.length})
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowEndShiftDialog(true)} className="text-xs">
              Akhiri Shift
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar min-h-0">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">Keranjang kosong</p>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="bg-muted/50 rounded-lg p-2">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-sm flex-1 line-clamp-1">{item.product.name}</p>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-destructive p-1 ml-1">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        className="w-14 h-6 text-center text-sm px-1 py-0 hide-spin-button"
                        value={item.quantity || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) {
                            setQuantity(item.product.id, val);
                          }
                        }}
                        onBlur={(e) => {
                          if (!e.target.value || parseInt(e.target.value) < 1) {
                            setQuantity(item.product.id, 1);
                          }
                        }}
                      />
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="font-semibold text-sm">{formatCurrency(item.product.price * item.quantity)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-border space-y-2 flex-shrink-0">
            {/* Tax Rate Input */}
            <div className="flex items-center justify-between text-sm">
              <span>Pajak (%)</span>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-20 h-7 text-right text-sm"
                placeholder="0"
              />
            </div>
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-sm">
                <span>Pajak ({taxRate}%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t border-border pt-2">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
            <Button
              className="w-full h-10"
              disabled={cart.length === 0}
              onClick={() => setShowPaymentDialog(true)}
            >
              Bayar {cart.length > 0 && formatCurrency(total)}
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => {
        setShowPaymentDialog(open);
        if (!open) {
          setIsMultiPayment(false);
          setPaymentSplits([]);
          setCurrentSplitAmount('');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Metode Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Pembayaran</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
            </div>

            {/* Multi-payment Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2">
                <Split className="h-4 w-4" />
                <span className="text-sm font-medium">Split Payment (DP + Pelunasan)</span>
              </div>
              <Checkbox
                checked={isMultiPayment}
                onCheckedChange={(checked) => {
                  setIsMultiPayment(!!checked);
                  setPaymentSplits([]);
                  setCurrentSplitAmount('');
                }}
              />
            </div>

            {!isMultiPayment ? (
              /* Single Payment Mode */
              <>
                <RadioGroup value={paymentMethod} onValueChange={(v) => {
                  setPaymentMethod(v as PaymentMethod | 'olshop');
                  setCashReceived('');
                }} className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="cash" />
                    <Banknote className="h-5 w-5" />
                    <span className="font-medium">Cash</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="qris" />
                    <QrCode className="h-5 w-5" />
                    <span className="font-medium">QRIS</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="transfer" />
                    <CreditCard className="h-5 w-5" />
                    <span className="font-medium">Transfer Bank</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="olshop" />
                    <Store className="h-5 w-5" />
                    <span className="font-medium">Olshop (Shopee/Tokopedia)</span>
                  </label>
                </RadioGroup>

                {/* Cash Payment Input */}
                {paymentMethod === 'cash' && (
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                    <div className="space-y-2">
                      <Label htmlFor="cashReceived">Uang Diterima</Label>
                      <Input
                        id="cashReceived"
                        type="number"
                        placeholder="0"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        className="text-lg font-semibold"
                        min={total}
                      />
                    </div>
                    {cashReceived && parseFloat(cashReceived) >= total && (
                      <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                        <span className="text-sm font-medium">Kembalian:</span>
                        <span className="text-xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(cashChange)}
                        </span>
                      </div>
                    )}
                    {cashReceived && parseFloat(cashReceived) < total && (
                      <p className="text-sm text-destructive">Uang tidak cukup</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Multi-payment Mode */
              <div className="space-y-4">
                {/* Current Splits */}
                {paymentSplits.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Pembayaran Tercatat:</p>
                    {paymentSplits.map((split, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950/20 rounded border">
                        <span className="capitalize">{split.method}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{formatCurrency(split.amount)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setPaymentSplits(prev => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span>Total Dibayar:</span>
                      <span className="font-semibold">{formatCurrency(paymentSplits.reduce((sum, s) => sum + s.amount, 0))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Sisa:</span>
                      <span className="font-semibold text-orange-600">{formatCurrency(total - paymentSplits.reduce((sum, s) => sum + s.amount, 0))}</span>
                    </div>
                  </div>
                )}

                {/* Add Payment Split */}
                {paymentSplits.reduce((sum, s) => sum + s.amount, 0) < total && (
                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                    <p className="text-sm font-medium">Tambah Pembayaran:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {['cash', 'qris', 'transfer', 'olshop'].map(method => (
                        <Button
                          key={method}
                          variant={paymentMethod === method ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPaymentMethod(method as any)}
                          className="text-xs capitalize"
                        >
                          {method}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Jumlah"
                        value={currentSplitAmount}
                        onChange={(e) => setCurrentSplitAmount(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => {
                          const amount = parseFloat(currentSplitAmount);
                          if (amount > 0) {
                            setPaymentSplits(prev => [...prev, { method: paymentMethod, amount }]);
                            setCurrentSplitAmount('');
                          }
                        }}
                        disabled={!currentSplitAmount || parseFloat(currentSplitAmount) <= 0}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPaymentDialog(false);
              setCashReceived('');
            }}>Batal</Button>
            <Button
              onClick={handlePayment}
              disabled={processing || (paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < total))}
            >
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

      {/* Receipt Printer Dialog */}
      {receiptData && (
        <ReceiptPrinter
          data={receiptData}
          open={showReceiptDialog}
          onClose={() => {
            setShowReceiptDialog(false);
            setReceiptData(null);
          }}
          paperWidth={58}
        />
      )}
    </MainLayout>
  );
}
