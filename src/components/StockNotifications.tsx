import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOutlet } from '@/hooks/useOutlet';
import { Bell, AlertTriangle, Package, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'react-router-dom';

interface LowStockItem {
    id: string;
    name: string;
    current_stock: number;
    min_stock: number;
    unit: string;
}

export default function StockNotifications() {
    const { selectedOutlet } = useOutlet();
    const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (selectedOutlet) {
            fetchLowStockItems();
        }
    }, [selectedOutlet]);

    const fetchLowStockItems = async () => {
        try {
            // Get inventory items where current_stock <= min_stock
            const { data, error } = await supabase
                .from('inventory_items')
                .select('id, name, current_stock, min_stock, unit')
                .gt('min_stock', 0) // Only items with min_stock set
                .order('name');

            if (error) throw error;

            // Filter in JS where current_stock <= min_stock
            const lowItems = (data || []).filter(
                (item) => Number(item.current_stock) <= Number(item.min_stock)
            );

            setLowStockItems(lowItems);
        } catch (error) {
            console.error('Error fetching low stock items:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStockLevel = (current: number, min: number) => {
        if (current <= 0) return 'empty';
        if (current <= min * 0.5) return 'critical';
        return 'low';
    };

    const notificationCount = lowStockItems.length;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-sidebar-foreground">
                    <Bell className="h-5 w-5" />
                    {notificationCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
                            {notificationCount > 9 ? '9+' : notificationCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <h4 className="font-semibold">Peringatan Stok</h4>
                    </div>
                    {notificationCount > 0 && (
                        <Badge variant="destructive">{notificationCount} item</Badge>
                    )}
                </div>

                <ScrollArea className="max-h-[300px]">
                    {loading ? (
                        <div className="p-4 text-center text-muted-foreground">Loading...</div>
                    ) : lowStockItems.length === 0 ? (
                        <div className="p-6 text-center">
                            <Package className="h-10 w-10 mx-auto text-green-500 mb-2" />
                            <p className="text-sm font-medium">Semua stok aman!</p>
                            <p className="text-xs text-muted-foreground">Tidak ada item di bawah minimum</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {lowStockItems.map((item) => {
                                const level = getStockLevel(Number(item.current_stock), Number(item.min_stock));
                                return (
                                    <div
                                        key={item.id}
                                        className={`p-3 flex items-center gap-3 ${level === 'empty'
                                                ? 'bg-red-50 dark:bg-red-950/20'
                                                : level === 'critical'
                                                    ? 'bg-amber-50 dark:bg-amber-950/20'
                                                    : 'bg-background'
                                            }`}
                                    >
                                        <div
                                            className={`w-2 h-2 rounded-full ${level === 'empty'
                                                    ? 'bg-red-500'
                                                    : level === 'critical'
                                                        ? 'bg-amber-500'
                                                        : 'bg-yellow-500'
                                                }`}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Stok: <span className="font-bold text-destructive">{item.current_stock}</span> / Min: {item.min_stock} {item.unit}
                                            </p>
                                        </div>
                                        {level === 'empty' && (
                                            <Badge variant="destructive" className="text-xs">HABIS</Badge>
                                        )}
                                        {level === 'critical' && (
                                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">KRITIS</Badge>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                {lowStockItems.length > 0 && (
                    <div className="p-3 border-t bg-muted/50">
                        <Link to="/inventory" onClick={() => setIsOpen(false)}>
                            <Button variant="outline" size="sm" className="w-full">
                                Lihat Inventory
                            </Button>
                        </Link>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
