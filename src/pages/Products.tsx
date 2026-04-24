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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useOutlet } from '@/hooks/useOutlet';
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit, Trash2, Package, Search, ListTree, Settings, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react';
import type { Product, Category } from '@/types/database';
import BulkImportDialog from '@/components/BulkImportDialog';
import type { BulkImportConfig, BulkColumnDef } from '@/components/BulkImportDialog';
import { Checkbox } from '@/components/ui/checkbox';

interface ProductOption {
  id: string;
  name: string;
}

interface ProductBomItemForm {
  id?: string;
  ingredient_product_id: string;
  quantity: string;
  unit: string;
  yield_percentage: string;
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
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showBomDialog, setShowBomDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<Record<string, any>>({});
  const [isBulkSaving, setIsBulkSaving] = useState(false);
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
    sku: '',
    name: '',
    description: '',
    price: '',
    cost_price: '',
    category_id: '',
    is_active: true,
    is_service: false,
    purchase_unit: '',
    base_unit: '',
    conversion_rate: '1',
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
        sku: (product as any).sku || '',
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        cost_price: (product as any).cost?.toString() || '0',
        category_id: product.category_id || '',
        is_active: product.is_active,
        is_service: (product as any).is_service || false,
        purchase_unit: product.purchase_unit || '',
        base_unit: product.base_unit || '',
        conversion_rate: product.conversion_rate?.toString() || '1',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        sku: '',
        name: '',
        description: '',
        price: '0',
        cost_price: '0',
        category_id: categories[0]?.id || '',
        is_active: true,
        is_service: false,
        purchase_unit: '',
        base_unit: 'pcs',
        conversion_rate: '1',
      });
    }
    setShowDialog(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleSelectProduct = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedProductIds(prev => [...prev, id]);
    } else {
      setSelectedProductIds(prev => prev.filter(productId => productId !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedProductIds.length) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedProductIds.length} produk/item yang dipilih?`)) return;

    try {
      const { error } = await supabase.from('products').delete().in('id', selectedProductIds);
      if (error) throw error;
      toast({ title: 'Sukses', description: `${selectedProductIds.length} produk berhasil dihapus` });
      setSelectedProductIds([]);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting products:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleOpenBulkEdit = () => {
    const initialData: Record<string, any> = {};
    selectedProductIds.forEach(id => {
      const product = products.find(p => p.id === id);
      if (product) {
        initialData[id] = {
          sku: (product as any).sku || '',
          name: product.name || '',
          base_unit: product.base_unit || '',
          category_id: product.category_id || 'unassigned',
          is_active: product.is_active ?? true,
        };
      }
    });
    setBulkEditData(initialData);
    setShowBulkEditDialog(true);
  };

  const handleSaveBulkEdit = async () => {
    setIsBulkSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedProductIds) {
      const data = bulkEditData[id];
      if (!data) continue;

      try {
        const updateData = {
          sku: data.sku || null,
          name: data.name,
          base_unit: data.base_unit || null,
          category_id: data.category_id === 'unassigned' ? null : data.category_id,
          is_active: data.is_active,
        };

        const { error } = await (supabase as any)
          .from('products')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;
        successCount++;
      } catch (err) {
        console.error('Bulk update error for id', id, err);
        failCount++;
      }
    }

    setIsBulkSaving(false);
    setShowBulkEditDialog(false);
    
    if (failCount > 0) {
      toast({ title: 'Selesai dengan Error', description: `${successCount} berhasil, ${failCount} gagal diupdate`, variant: 'destructive' });
    } else {
      toast({ title: 'Sukses', description: `${successCount} item berhasil diupdate` });
    }
    
    setSelectedProductIds([]);
    fetchData();
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({ title: 'Error', description: 'Nama harus diisi', variant: 'destructive' });
      return;
    }

    try {
      const productData = {
        sku: formData.sku || null,
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost_price) || 0,
        category_id: formData.category_id || null,
        is_active: formData.is_active,
        is_service: formData.is_service,
        purchase_unit: formData.purchase_unit || null,
        base_unit: formData.base_unit || null,
        conversion_rate: parseFloat(formData.conversion_rate) || 1,
        outlet_id: selectedOutlet?.id,
      };

      if (editingProduct) {
        const { error } = await (supabase as any)
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({ title: 'Sukses', description: 'Produk berhasil diupdate' });
      } else {
        const { error } = await (supabase as any)
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
        yield_percentage: '100',
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
          .select('id, ingredient_product_id, quantity, unit, notes, yield_percentage')
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
        yield_percentage: String(row.yield_percentage ?? '100'),
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
                yield_percentage: '100',
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
        yield_percentage: parseFloat(row.yield_percentage) || 100,
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
          yield_percentage: row.yield_percentage,
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Produk
                  <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Satuan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowBulkImport(true)}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Bulk Import (XLSX)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            <div className="flex items-center justify-between">
              <CardTitle className="font-display flex items-center gap-2">
                <Package className="h-5 w-5" />
                Daftar Bahan / Produk ({filteredProducts.length})
              </CardTitle>
              {selectedProductIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground mr-2">
                    {selectedProductIds.length} item dipilih
                  </span>
                  <Button variant="outline" size="sm" onClick={handleOpenBulkEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Pilihan
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Hapus Pilihan
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Kode Bahan</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Tidak ada produk ditemukan
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedProductIds.includes(product.id)}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-muted-foreground">{(product as any).sku || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.base_unit || '-'}
                        </TableCell>
                        <TableCell>{getCategoryName(product.category_id)}</TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            product.is_active 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {product.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">Kode Bahan</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Contoh: BHN-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nama *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Daging Sapi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_unit">Satuan *</Label>
                  <Input
                    id="base_unit"
                    value={formData.base_unit}
                    onChange={(e) => setFormData({ ...formData, base_unit: e.target.value })}
                    placeholder="kg, pcs, liter"
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi singkat..."
                  rows={2}
                />
              </div>

              {/* Optional / Advanced Settings hidden in accordion or just visually secondary */}
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm font-medium mb-3 text-muted-foreground">Pengaturan Lanjutan (Opsional)</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="cost_price">Harga Pokok (HPP)</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Harga Jual</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
              
              {!formData.is_service && (
                <div className="grid grid-cols-3 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                  <div className="col-span-3">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                       Unit of Measurement (UoM) / Konversi Satuan
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1 mb-2">Atur ini jika bahan dibeli dalam satuan besar tapi dicatat gudang dalam satuan kecil.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchase_unit">Satuan Beli (PO)</Label>
                    <Input
                      id="purchase_unit"
                      value={formData.purchase_unit}
                      onChange={(e) => setFormData({ ...formData, purchase_unit: e.target.value })}
                      placeholder="Dus, Box"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conversion_rate">Nilai Konversi</Label>
                    <Input
                      id="conversion_rate"
                      type="number"
                      value={formData.conversion_rate}
                      onChange={(e) => setFormData({ ...formData, conversion_rate: e.target.value })}
                      placeholder="12"
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="base_unit">Satuan Dasar (Stock)</Label>
                    <Input
                      id="base_unit"
                      value={formData.base_unit}
                      onChange={(e) => setFormData({ ...formData, base_unit: e.target.value })}
                      placeholder="Liter, Kg"
                    />
                  </div>
                </div>
              )}

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
                    <div className="col-span-12 md:col-span-3 space-y-1">
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

                    <div className="col-span-4 md:col-span-2 space-y-1">
                      <Label>Satuan</Label>
                      <Input
                        value={row.unit}
                        onChange={(e) => updateBomRow(idx, { unit: e.target.value })}
                        placeholder="pcs"
                      />
                    </div>

                    <div className="col-span-4 md:col-span-2 space-y-1">
                      <Label>Yield (%)</Label>
                      <Input
                        type="number"
                        value={row.yield_percentage}
                        onChange={(e) => updateBomRow(idx, { yield_percentage: e.target.value })}
                        placeholder="100"
                        min="1"
                        max="100"
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

        {/* Bulk Edit Dialog */}
        <Dialog open={showBulkEditDialog} onOpenChange={setShowBulkEditDialog}>
          <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-display">Edit Masal ({selectedProductIds.length} Produk)</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto py-4 border-y">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Kode Bahan</TableHead>
                    <TableHead>Nama *</TableHead>
                    <TableHead>Satuan *</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedProductIds.map(id => {
                    const data = bulkEditData[id];
                    if (!data) return null;
                    return (
                      <TableRow key={id}>
                        <TableCell className="p-1">
                          <Input
                            value={data.sku}
                            onChange={(e) => setBulkEditData(prev => ({ ...prev, [id]: { ...prev[id], sku: e.target.value } }))}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            value={data.name}
                            onChange={(e) => setBulkEditData(prev => ({ ...prev, [id]: { ...prev[id], name: e.target.value } }))}
                            className="h-8 min-w-[150px]"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            value={data.base_unit}
                            onChange={(e) => setBulkEditData(prev => ({ ...prev, [id]: { ...prev[id], base_unit: e.target.value } }))}
                            className="h-8 w-24"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Select
                            value={data.category_id}
                            onValueChange={(v) => setBulkEditData(prev => ({ ...prev, [id]: { ...prev[id], category_id: v } }))}
                          >
                            <SelectTrigger className="h-8 border-transparent hover:border-border">
                              <SelectValue placeholder="Kategori" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">- Tanpa Kategori -</SelectItem>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1 text-center">
                          <div className="flex justify-center">
                            <Switch
                              checked={data.is_active}
                              onCheckedChange={(checked) => setBulkEditData(prev => ({ ...prev, [id]: { ...prev[id], is_active: checked } }))}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkEditDialog(false)}>Batal</Button>
              <Button onClick={handleSaveBulkEdit} disabled={isBulkSaving}>
                {isBulkSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Perubahan'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <BulkImportDialog
          open={showBulkImport}
          onOpenChange={setShowBulkImport}
          config={{
            entityName: 'Item/Bahan',
            templateFileName: 'template_bahan.xlsx',
            columns: [
              { key: 'sku', label: 'Kode Bahan', type: 'text', required: false, description: 'Kode unik bahan' },
              { key: 'name', label: 'Nama', type: 'text', required: true, description: 'Nama bahan (WAJIB)' },
              { key: 'base_unit', label: 'Satuan', type: 'text', required: true, description: 'Satuan (WAJIB) cth: kg, pcs' },
              { key: 'category', label: 'Kategori', type: 'text', required: false, description: categories.map(c => c.name).join(', ') || 'Nama kategori', options: categories.map(c => c.name) },
              { key: 'is_active', label: 'Status Aktif', type: 'boolean', required: false, description: 'Ya / Tidak', defaultValue: 'Ya', options: ['Ya', 'Tidak'] },
            ],
            onImport: async (rows) => {
              let success = 0;
              let failed = 0;
              const errors: string[] = [];

              for (const row of rows) {
                try {
                  // Find category id by name
                  let categoryId: string | null = null;
                  if (row.category) {
                    const cat = categories.find(c => c.name.toLowerCase() === String(row.category).toLowerCase());
                    categoryId = cat?.id || null;
                  }

                  const { error } = await (supabase as any).from('products').insert({
                    sku: row.sku ? String(row.sku) : null,
                    name: String(row.name),
                    base_unit: String(row.base_unit),
                    category_id: categoryId,
                    price: 0,
                    cost: 0,
                    is_active: String(row.is_active).toLowerCase() !== 'tidak',
                    is_service: false,
                    outlet_id: selectedOutlet?.id,
                  });

                  if (error) throw error;
                  success++;
                } catch (err: any) {
                  failed++;
                  errors.push(`Baris "${row.name}": ${err.message}`);
                }
              }

              if (success > 0) fetchData();
              return { success, failed, errors };
            },
          }}
        />
      </div>
    </MainLayout>
  );
}
