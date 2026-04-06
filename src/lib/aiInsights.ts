import { supabase } from '@/integrations/supabase/client';

export interface BusinessInsight {
    id: string;
    type: 'warning' | 'success' | 'info' | 'alert';
    category: 'sales' | 'inventory' | 'expense' | 'trend';
    title: string;
    description: string;
    metric?: string;
    change?: number;
    actionLabel?: string;
    actionHref?: string;
}

interface TransactionData {
    id: string;
    total: number;
    created_at: string;
    transaction_items?: { product_name: string; quantity: number; subtotal: number }[];
}

interface InventoryItem {
    id: string;
    name: string;
    current_stock: number;
    min_stock: number;
    unit: string;
}

interface ExpenseData {
    id: string;
    amount: number;
    created_at: string;
    category_id: string;
}

export async function generateBusinessInsights(outletId: string): Promise<BusinessInsight[]> {
    const insights: BusinessInsight[] = [];
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    try {
        // Fetch recent transactions (last 7 days)
        const { data: recentTransactions } = await supabase
            .from('transactions')
            .select('id, total, created_at, transaction_items(product_name, quantity, subtotal)')
            .eq('outlet_id', outletId)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: false });

        // Fetch previous week transactions (7-14 days ago)
        const { data: prevTransactions } = await supabase
            .from('transactions')
            .select('id, total, created_at')
            .eq('outlet_id', outletId)
            .gte('created_at', fourteenDaysAgo.toISOString())
            .lt('created_at', sevenDaysAgo.toISOString());

        // Fetch inventory items
        const { data: inventoryItems } = await supabase
            .from('inventory_items')
            .select('id, name, current_stock, min_stock, unit');

        // Fetch recent expenses
        const { data: recentExpenses } = await supabase
            .from('expenses')
            .select('id, amount, created_at, category_id')
            .eq('outlet_id', outletId)
            .eq('status', 'approved')
            .gte('created_at', sevenDaysAgo.toISOString());

        const { data: prevExpenses } = await supabase
            .from('expenses')
            .select('id, amount, created_at')
            .eq('outlet_id', outletId)
            .eq('status', 'approved')
            .gte('created_at', fourteenDaysAgo.toISOString())
            .lt('created_at', sevenDaysAgo.toISOString());

        // === INSIGHT 1: Sales Trend ===
        const recentSales = recentTransactions?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
        const prevSales = prevTransactions?.reduce((sum, t) => sum + Number(t.total), 0) || 0;

        if (prevSales > 0) {
            const salesChange = ((recentSales - prevSales) / prevSales) * 100;

            if (salesChange >= 10) {
                insights.push({
                    id: 'sales-up',
                    type: 'success',
                    category: 'sales',
                    title: 'Penjualan Meningkat!',
                    description: `Penjualan 7 hari terakhir naik ${salesChange.toFixed(1)}% dibanding minggu sebelumnya.`,
                    metric: `+${salesChange.toFixed(1)}%`,
                    change: salesChange
                });
            } else if (salesChange <= -15) {
                insights.push({
                    id: 'sales-down',
                    type: 'warning',
                    category: 'sales',
                    title: 'Penjualan Menurun',
                    description: `Penjualan turun ${Math.abs(salesChange).toFixed(1)}% dari minggu lalu. Pertimbangkan promosi atau evaluasi produk.`,
                    metric: `${salesChange.toFixed(1)}%`,
                    change: salesChange,
                    actionLabel: 'Lihat Laporan',
                    actionHref: '/reports'
                });
            }
        }

        // === INSIGHT 2: Top Product Trend ===
        if (recentTransactions && recentTransactions.length > 0) {
            const productSales = new Map<string, number>();

            recentTransactions.forEach((tx: any) => {
                tx.transaction_items?.forEach((item: any) => {
                    const current = productSales.get(item.product_name) || 0;
                    productSales.set(item.product_name, current + Number(item.subtotal));
                });
            });

            const sortedProducts = Array.from(productSales.entries())
                .sort((a, b) => b[1] - a[1]);

            if (sortedProducts.length > 0) {
                const topProduct = sortedProducts[0];
                insights.push({
                    id: 'top-product',
                    type: 'info',
                    category: 'trend',
                    title: 'Produk Terlaris Minggu Ini',
                    description: `"${topProduct[0]}" menjadi produk dengan penjualan tertinggi.`,
                    metric: `Rp ${topProduct[1].toLocaleString('id-ID')}`
                });
            }
        }

        // === INSIGHT 3: Low Stock Prediction ===
        if (inventoryItems) {
            const criticalItems = inventoryItems.filter(
                (item) => Number(item.current_stock) <= Number(item.min_stock) && Number(item.min_stock) > 0
            );

            if (criticalItems.length > 0) {
                const itemNames = criticalItems.slice(0, 3).map(i => i.name).join(', ');
                insights.push({
                    id: 'low-stock',
                    type: 'alert',
                    category: 'inventory',
                    title: `${criticalItems.length} Item Stok Menipis`,
                    description: `${itemNames}${criticalItems.length > 3 ? ` dan ${criticalItems.length - 3} lainnya` : ''} perlu di-restock.`,
                    actionLabel: 'Buat PO',
                    actionHref: '/warehouse/purchase-orders'
                });
            }

            // Predict stock depletion (rough estimate based on min_stock as daily usage)
            const almostOut = inventoryItems.filter((item) => {
                const stock = Number(item.current_stock);
                const dailyUsage = Number(item.min_stock) / 7; // Assume min_stock is weekly target
                const daysLeft = dailyUsage > 0 ? stock / dailyUsage : 999;
                return daysLeft <= 5 && daysLeft > 0 && stock > 0;
            });

            if (almostOut.length > 0 && almostOut.length <= 5) {
                insights.push({
                    id: 'stock-prediction',
                    type: 'warning',
                    category: 'inventory',
                    title: 'Prediksi Stok Habis',
                    description: `${almostOut[0].name} diprediksi habis dalam 5 hari berdasarkan pola konsumsi.`,
                    actionLabel: 'Lihat Inventory',
                    actionHref: '/warehouse/inventory'
                });
            }
        }

        // === INSIGHT 4: Expense Alert ===
        const recentExpenseTotal = recentExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        const prevExpenseTotal = prevExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

        if (prevExpenseTotal > 0) {
            const expenseChange = ((recentExpenseTotal - prevExpenseTotal) / prevExpenseTotal) * 100;

            if (expenseChange >= 30) {
                insights.push({
                    id: 'expense-spike',
                    type: 'warning',
                    category: 'expense',
                    title: 'Pengeluaran Meningkat',
                    description: `Pengeluaran naik ${expenseChange.toFixed(1)}% minggu ini. Review untuk optimasi biaya.`,
                    metric: `+${expenseChange.toFixed(1)}%`,
                    change: expenseChange,
                    actionLabel: 'Lihat Laporan',
                    actionHref: '/reports'
                });
            }
        }

        // === INSIGHT 5: Daily Average ===
        if (recentTransactions && recentTransactions.length >= 3) {
            const avgDaily = recentSales / 7;
            const txCount = recentTransactions.length;

            insights.push({
                id: 'daily-avg',
                type: 'info',
                category: 'sales',
                title: 'Performa Harian',
                description: `Rata-rata penjualan harian: Rp ${avgDaily.toLocaleString('id-ID', { maximumFractionDigits: 0 })} dari ${txCount} transaksi.`,
                metric: `${txCount} tx/minggu`
            });
        }

        // === INSIGHT 6: No Sales Today ===
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);

        const todayTx = recentTransactions?.filter(tx =>
            new Date(tx.created_at) >= todayStart
        );

        if (todayTx && todayTx.length === 0 && today.getHours() >= 12) {
            insights.push({
                id: 'no-sales-today',
                type: 'warning',
                category: 'sales',
                title: 'Belum Ada Transaksi Hari Ini',
                description: 'Sudah lewat tengah hari tapi belum ada penjualan. Pastikan kasir aktif.',
                actionLabel: 'Buka POS',
                actionHref: '/pos'
            });
        }

        // Sort insights by priority: alert > warning > success > info
        const priority = { alert: 0, warning: 1, success: 2, info: 3 };
        insights.sort((a, b) => priority[a.type] - priority[b.type]);

        return insights.slice(0, 6); // Max 6 insights

    } catch (error) {
        console.error('Error generating insights:', error);
        return [];
    }
}
