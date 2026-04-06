import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useOutlet } from '@/hooks/useOutlet';
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit, Trash2, Package, Search, ListTree, Settings } from 'lucide-react';
import type { Product, Category } from '@/types/database';

interface ProductOption {
  id: string;
  name: string;
}

interface ProductBomItemForm {
  id?: string;
  ingredient_product_id: string;
  quantity: string;
  unit: string;
  notes: string;
}

export default function Products() {
  const projectRef = (() => {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!url) return 'unknown';
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/i);
    return match?.[1] || 'unknown';
  })();

  const { toast } = useToast();
  const { selectedOutlet } = useOutlet();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showBomDialog, setShowBomDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  });
  const [bomProduct, setBomProduct] = useState<Product | null>(null);
  const [bomLoading, setBomLoading] = useState(false);
  const [bomItems, setBomItems] = useState<ProductBomItemForm[]>([]);
  const [ingredientOptions, setIngredientOptions] = useState<ProductOption[]>([]);
  const [bomCounts, setBomCounts] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost_price: '',
    category_id: '',
    is_active: true,
    is_service: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setProducts((productsRes.data || []) as unknown as Product[]);
      setCategories((categoriesRes.data || []) as unknown as Category[]);

      const { data: bomRows, error: bomError } = await (supabase as any)
        .from('product_bom_items')
        .select('product_id');

      if (!bomError) {
        const nextCounts: Record<string, number> = {};
        (bomRows || []).forEach((row: any) => {
          nextCounts[row.product_id] = (nextCounts[row.product_id] || 0) + 1;
        });
        setBomCounts(nextCounts);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        cost_price: (product as any).cost?.toString() || '0',
        category_id: product.category_id || '',
        is_active: product.is_active,
        is_service: (product as any).is_service || false,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        cost_price: '0',
        category_id: categories[0]?.id || '',
        is_active: true,
        is_service: false,
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price) {
      toast({ title: 'Error', description: 'Nama dan harga harus diisi', variant: 'destructive' });
      return;
    }

    try {
      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost_price) || 0,
        category_id: formData.category_id || null,
        is_active: formData.is_active,
        is_service: formData.is_service,
        outlet_id: selectedOutlet?.id,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({ title: 'Sukses', description: 'Produk berhasil diupdate' });
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
        toast({ title: 'Sukses', description: 'Produk berhasil ditambahkan' });
      }

      setShowDialog(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sukses', description: 'Produk berhasil dihapus' });
      fetchData();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const addBomRow = () => {
    setBomItems((prev) => [
      ...prev,
      {
        ingredient_product_id: '',
        quantity: '1',
        unit: 'pcs',
        notes: '',
      },
    ]);
  };

  const updateBomRow = (index: number, patch: Partial<ProductBomItemForm>) => {
    setBomItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeBomRow = (index: number) => {
    setBomItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        description: '',
      });
    }
    setShowCategoryDialog(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast({ title: 'Error', description: 'Nama kategori harus diisi', variant: 'destructive' });
      return;
    }

    try {
      const categoryData = {
        name: categoryForm.name.trim(),
        description: categoryForm.description || null,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast({ title: 'Sukses', description: 'Kategori berhasil diupdate' });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(categoryData);

        if (error) throw error;
        toast({ title: 'Sukses', description: 'Kategori berhasil ditambahkan' });
      }

      setShowCategoryDialog(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Apakah Anda yakin? Produk dengan kategori ini akan berubah ke kategori kosong.')) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sukses', description: 'Kategori berhasil dihapus' });
      fetchData();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleOpenBomDialog = async (product: Product) => {
    setBomProduct(product);
    setShowBomDialog(true);
    setBomLoading(true);

    try {
      const [optionsRes, bomRes] = await Promise.all([
        (supabase as any)
          .from('products')
          .select('id, name, is_service, is_active')
          .eq('is_active', true)
          .order('name'),
        (supabase as any)
          .from('product_bom_items')
          .select('id, ingredient_product_id, quantity, unit, notes')
          .eq('product_id', product.id)
          .order('created_at', { ascending: true }),
      ]);

      if (optionsRes.error) throw optionsRes.error;
      if (bomRes.error) throw bomRes.error;

      const options = (optionsRes.data || [])
        .filter((item: any) => item.id !== product.id && !item.is_service)
        .map((item: any) => ({ id: item.id, name: item.name }));

      setIngredientOptions(options);

      const existingBom: ProductBomItemForm[] = (bomRes.data || []).map((row: any) => ({
        id: row.id,
        ingredient_product_id: row.ingredient_product_id,
        quantity: String(row.quantity ?? '1'),
        unit: row.unit || 'pcs',
        notes: row.notes || '',
      }));

      setBomItems(
        existingBom.length > 0
          ? existingBom
          : [
              {
                ingredient_product_id: '',
                quantity: '1',
                unit: 'pcs',
                notes: '',
              },
            ]
      );
    } catch (error: any) {
      const isSchemaCacheError =
        typeof error?.message === 'string' &&
        (error.message.includes('schema cache') || error.message.includes('Could not find the table'));

      toast({
        title: 'BOM belum siap',
        description: isSchemaCacheError
          ? `Tabel BOM belum terbaca oleh API. Project app saat ini: ${projectRef}. Jalankan migration BOM di project itu, lalu GRANT untuk role authenticated/anon.`
          : error.message || 'Tabel BOM belum tersedia. Jalankan migration BOM terlebih dahulu, lalu coba lagi.',
        variant: 'destructive',
      });
      setShowBomDialog(false);
    } finally {
      setBomLoading(false);
    }
  };

  const handleSaveBom = async () => {
    if (!bomProduct) return;

    const validRows = bomItems
      .filter((row) => row.ingredient_product_id && (parseFloat(row.quantity) || 0) > 0)
      .map((row) => ({
        ingredient_product_id: row.ingredient_product_id,
        quantity: parseFloat(row.quantity),
        unit: row.unit || 'pcs',
        notes: row.notes || null,
      }));

    const uniqueIngredientCount = new Set(validRows.map((r) => r.ingredient_product_id)).size;
    if (uniqueIngredientCount !== validRows.length) {
      toast({
        title: 'Error',
        description: 'Bahan tidak boleh duplikat dalam satu BOM produk.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error: clearError } = await (supabase as any)
        .from('product_bom_items')
        .delete()
        .eq('product_id', bomProduct.id);

      if (clearError) throw clearError;

      if (validRows.length > 0) {
        const payload = validRows.map((row) => ({
          product_id: bomProduct.id,
          ingredient_product_id: row.ingredient_product_id,
          quantity: row.quantity,
          unit: row.unit,
          notes: row.notes,
        }));

        const { error: insertError } = await (supabase as any).from('product_bom_items').insert(payload);
        if (insertError) throw insertError;
      }

      toast({ title: 'Sukses', description: 'BOM produk berhasil disimpan' });
      setShowBomDialog(false);
      setBomProduct(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '-';
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || '-';
  };

  const profitMargin = (price: number, costPrice: number) => {
    if (price === 0) return 0;
    return ((price - costPrice) / price * 100).toFixed(1);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Produk & Layanan</h1>
            <p className="text-muted-foreground">Kelola produk, harga jual, dan HPP</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => handleOpenCategoryDialog()}>
              <Settings className="h-4 w-4 mr-2" />
              Atur Kategori
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Produk
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="card-warm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="card-warm">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Package className="h-5 w-5" />
              Daftar Produk ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Produk</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Harga Jual</TableHead>
                    <TableHead className="text-right">HPP</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Tipe</TableHead>
                    <TableHead className="text-center">BOM</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Tidak ada produk ditemukan
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getCategoryName(product.category_id)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(product.price)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency((product as any).cost || 0)}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-medium ${
                            Number(profitMargin(product.price, (product as any).cost || 0)) >= 30 
                              ? 'text-green-600' 
                              : Number(profitMargin(product.price, (product as any).cost || 0)) >= 15 
                                ? 'text-yellow-600' 
                                : 'text-red-600'
                          }`}>
                            {profitMargin(product.price, (product as any).cost || 0)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            product.is_active 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {product.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {(product as any).is_service ? (
                            <Badge variant="secondary">Layanan (tanpa stok)</Badge>
                          ) : (
                            <Badge variant="outline">Barang (sinkron inventory)</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {(product as any).is_service ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : (bomCounts[product.id] || 0) > 0 ? (
                            <Badge variant="secondary">{bomCounts[product.id]} bahan</Badge>
                          ) : (
                            <Badge variant="outline">Tanpa BOM</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenBomDialog(product)}
                              disabled={(product as any).is_service}
                            >
                              <ListTree className="h-4 w-4 mr-1" />
                              BOM
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(product.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Produk *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Potong Rambut Dewasa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi singkat produk..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Harga Jual *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="50000"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_price">HPP (Harga Pokok)</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    placeholder="0"
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">Cost of Goods Sold</p>
                </div>
              </div>

              {formData.price && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">
                    Profit per item:{' '}
                    <span className="font-medium text-foreground">
                      {formatCurrency((parseFloat(formData.price) || 0) - (parseFloat(formData.cost_price) || 0))}
                    </span>
                    {' '}({profitMargin(parseFloat(formData.price) || 0, parseFloat(formData.cost_price) || 0)}% margin)
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Status Aktif</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_service">Produk Ini Adalah Layanan</Label>
                  <p className="text-xs text-muted-foreground">Jika aktif, item tidak muncul di halaman Inventory.</p>
                </div>
                <Switch
                  id="is_service"
                  checked={formData.is_service}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_service: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button onClick={handleSave}>
                {editingProduct ? 'Update' : 'Simpan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showBomDialog} onOpenChange={setShowBomDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display">
                BOM Produk: {bomProduct?.name || '-'}
              </DialogTitle>
            </DialogHeader>

            {bomLoading ? (
              <div className="py-10 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-muted-foreground">
                  Tentukan bahan yang dipotong dari inventory setiap 1 unit produk terjual.
                </p>

                {bomItems.map((row, idx) => (
                  <div key={row.id || idx} className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg border">
                    <div className="col-span-12 md:col-span-5 space-y-1">
                      <Label>Bahan</Label>
                      <Select
                        value={row.ingredient_product_id}
                        onValueChange={(v) => updateBomRow(idx, { ingredient_product_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih bahan" />
                        </SelectTrigger>
                        <SelectContent>
                          {ingredientOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-6 md:col-span-2 space-y-1">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.quantity}
                        onChange={(e) => updateBomRow(idx, { quantity: e.target.value })}
                      />
                    </div>

                    <div className="col-span-6 md:col-span-2 space-y-1">
                      <Label>Satuan</Label>
                      <Input
                        value={row.unit}
                        onChange={(e) => updateBomRow(idx, { unit: e.target.value })}
                        placeholder="pcs"
                      />
                    </div>

                    <div className="col-span-10 md:col-span-2 space-y-1">
                      <Label>Catatan</Label>
                      <Input
                        value={row.notes}
                        onChange={(e) => updateBomRow(idx, { notes: e.target.value })}
                        placeholder="Opsional"
                      />
                    </div>

                    <div className="col-span-2 md:col-span-1 pt-7 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBomRow(idx)}
                        disabled={bomItems.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={addBomRow}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Bahan
                </Button>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBomDialog(false)}>Batal</Button>
              <Button onClick={handleSaveBom} disabled={bomLoading}>Simpan BOM</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Category Management Dialog */}
        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Form untuk tambah/edit */}
              <div className="space-y-3 border-b pb-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Nama Kategori *</Label>
                  <Input
                    id="category-name"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="Contoh: Perawatan, Styling, dsb"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-desc">Deskripsi</Label>
                  <Textarea
                    id="category-desc"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    placeholder="Deskripsi kategori (opsional)"
                    rows={2}
                  />
                </div>
                <Button onClick={handleSaveCategory} className="w-full">
                  {editingCategory ? 'Update Kategori' : 'Tambah Kategori'}
                </Button>
              </div>

              {/* List kategori */}
              <div>
                <h3 className="font-semibold mb-3">Daftar Kategori (Total: {categories.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Belum ada kategori</p>
                  ) : (
                    categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{cat.name}</p>
                          {cat.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{cat.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenCategoryDialog(cat)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
