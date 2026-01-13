import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOutlet } from '@/hooks/useOutlet';
import { generateBusinessInsights, BusinessInsight } from '@/lib/aiInsights';
import { Link } from 'react-router-dom';
import {
    TrendingUp, TrendingDown, AlertTriangle, Info,
    Sparkles, RefreshCw, Package, DollarSign, BarChart3
} from 'lucide-react';

const typeStyles = {
    success: 'border-green-200 bg-green-50/50 dark:bg-green-950/20',
    warning: 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20',
    alert: 'border-red-200 bg-red-50/50 dark:bg-red-950/20',
    info: 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20'
};

const typeIcons = {
    success: <TrendingUp className="h-5 w-5 text-green-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    alert: <AlertTriangle className="h-5 w-5 text-red-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />
};

const categoryIcons = {
    sales: <DollarSign className="h-4 w-4" />,
    inventory: <Package className="h-4 w-4" />,
    expense: <BarChart3 className="h-4 w-4" />,
    trend: <TrendingUp className="h-4 w-4" />
};

export default function AIInsightsPanel() {
    const { selectedOutlet } = useOutlet();
    const [insights, setInsights] = useState<BusinessInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (selectedOutlet) {
            loadInsights();
        }
    }, [selectedOutlet]);

    const loadInsights = async () => {
        if (!selectedOutlet) return;

        setLoading(true);
        try {
            const data = await generateBusinessInsights(selectedOutlet.id);
            setInsights(data);
        } catch (error) {
            console.error('Error loading insights:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadInsights();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        <h2 className="font-display text-lg font-semibold">AI Insights</h2>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="border">
                            <CardContent className="p-4 space-y-3">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (insights.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        <h2 className="font-display text-lg font-semibold">AI Insights</h2>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
                <Card className="border-dashed">
                    <CardContent className="p-6 text-center">
                        <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Belum cukup data untuk menghasilkan insight.</p>
                        <p className="text-sm text-muted-foreground mt-1">Lakukan beberapa transaksi terlebih dahulu.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <h2 className="font-display text-lg font-semibold">AI Insights</h2>
                    <Badge variant="secondary" className="text-xs">
                        Powered by BarberDoc AI
                    </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.map((insight) => (
                    <Card
                        key={insight.id}
                        className={`border-2 transition-all hover:shadow-md ${typeStyles[insight.type]}`}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    {typeIcons[insight.type]}
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-sm">{insight.title}</h3>
                                        {insight.metric && (
                                            <Badge
                                                variant="outline"
                                                className={`text-xs ${insight.type === 'success' ? 'border-green-300 text-green-700' :
                                                        insight.type === 'warning' || insight.type === 'alert' ? 'border-amber-300 text-amber-700' :
                                                            'border-blue-300 text-blue-700'
                                                    }`}
                                            >
                                                {insight.metric}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {insight.description}
                                    </p>
                                    {insight.actionLabel && insight.actionHref && (
                                        <Link to={insight.actionHref}>
                                            <Button size="sm" variant="outline" className="mt-2 h-7 text-xs">
                                                {categoryIcons[insight.category]}
                                                <span className="ml-1">{insight.actionLabel}</span>
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
