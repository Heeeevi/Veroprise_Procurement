import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileCode2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';


export default function BomManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [boms, setBoms] = useState<any[]>([]);

  useEffect(() => {
    fetchBoms();
  }, []);

  const fetchBoms = async () => {
    try {
      setLoading(true);
      // Fetch all boms with their parent product and ingredient product
      const { data, error } = await (supabase as any)
        .from('product_bom_items')
        .select(`
          id, quantity, unit, yield_percentage, notes,
          parent:products!product_id(id, name, is_active),
          ingredient:products!ingredient_product_id(name)
        `)
        .order('product_id');

      if (error) throw error;
      
      // Group by Parent Product
      const grouped = new Map();
      (data || []).forEach((row: any) => {
         // only include if parent is valid
         if (!row.parent) return;
         
         if (!grouped.has(row.parent.id)) {
            grouped.set(row.parent.id, {
               id: row.parent.id,
               name: row.parent.name,
               is_active: row.parent.is_active,
               ingredients: []
            });
         }
         grouped.get(row.parent.id).ingredients.push(row);
      });

      setBoms(Array.from(grouped.values()));
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <FileCode2 className="h-6 w-6" /> Bill of Materials (BoM)
            </h1>
            <p className="text-muted-foreground">Master Data Resep: BoM Produk Jadi & Pre Mixture</p>
          </div>
          <Button onClick={() => navigate('/stock/items')}>
            Edit Resep di Master Produk
          </Button>
        </div>



        <div className="grid grid-cols-1 gap-6">
           {loading ? (
              <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
           ) : boms.length === 0 ? (
              <Card>
                 <CardContent className="py-12 text-center text-muted-foreground">
                    Belum ada BoM yang tercatat. Silakan pergi ke Master Item dan edit BoM pada produk yang diinginkan.
                 </CardContent>
              </Card>
           ) : (
              boms.map((bom) => (
                 <Card key={bom.id} className={!bom.is_active ? 'opacity-60' : ''}>
                    <CardHeader className="bg-muted/30 pb-4">
                       <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">
                             {bom.name} {!bom.is_active && <Badge variant="outline" className="ml-2">Non-aktif</Badge>}
                          </CardTitle>
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                             {bom.ingredients.length} Bahan
                          </Badge>
                       </div>
                    </CardHeader>
                    <CardContent className="p-0">
                       <Table>
                          <TableHeader>
                             <TableRow>
                                <TableHead className="pl-6">Nama Bahan / Pre-Mixture</TableHead>
                                <TableHead>Kuantitas</TableHead>
                                <TableHead>Satuan</TableHead>
                                <TableHead>Yield (%)</TableHead>
                                <TableHead>Catatan</TableHead>
                             </TableRow>
                          </TableHeader>
                          <TableBody>
                             {bom.ingredients.map((ing: any) => (
                                <TableRow key={ing.id}>
                                   <TableCell className="pl-6 font-medium">{ing.ingredient?.name || 'Unknown'}</TableCell>
                                   <TableCell>{Number(ing.quantity).toFixed(2)}</TableCell>
                                   <TableCell>{ing.unit}</TableCell>
                                   <TableCell>
                                      {ing.yield_percentage ? (
                                         <span className={Number(ing.yield_percentage) < 100 ? 'text-orange-600 font-medium' : ''}>
                                            {ing.yield_percentage}%
                                         </span>
                                      ) : '100%'}
                                   </TableCell>
                                   <TableCell className="text-muted-foreground text-sm">{ing.notes || '-'}</TableCell>
                                </TableRow>
                             ))}
                          </TableBody>
                       </Table>
                    </CardContent>
                 </Card>
              ))
           )}
        </div>
      </div>
    </MainLayout>
  );
}
