import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOutlet } from '@/hooks/useOutlet';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, LayoutDashboard, ShoppingCart, Package, Receipt, Users, BarChart3, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import WelcomeTour from '@/components/WelcomeTour';

interface QuickStats {
  todaySales: number;
  todayTransactions: number;
  todayExpenses: number;
  profit: number;
}

export default function Index() {
  const { user, profile, role, loading, signOut } = useAuth();
  const { selectedOutlet } = useOutlet();
  const [stats, setStats] = useState<QuickStats>({
    todaySales: 0,
    todayTransactions: 0,
    todayExpenses: 0,
    profit: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (selectedOutlet && (role === 'owner' || role === 'super_admin' || role === 'manager' || role === 'pengadaan')) {
      fetchQuickStats();
    } else {
      setStatsLoading(false);
    }
  }, [selectedOutlet, role]);

  const fetchQuickStats = async () => {
    if (!selectedOutlet) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      // Today's transactions
      const { data: todayTx } = await supabase
        .from('transactions')
        .select('total')
        .eq('outlet_id', selectedOutlet.id)
        .gte('created_at', today);

      const todaySales = todayTx?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
      const todayTransactions = todayTx?.length || 0;

      // Today's expenses
      const { data: todayExp } = await supabase
        .from('expenses')
        .select('amount')
        .eq('outlet_id', selectedOutlet.id)
        .eq('status', 'approved')
        .gte('created_at', today);

      const todayExpenses = todayExp?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Calculate profit (month to date for better insight)
      const { data: monthTx } = await supabase
        .from('transactions')
        .select('total')
        .eq('outlet_id', selectedOutlet.id)
        .gte('created_at', monthStart);

      const { data: monthExp } = await supabase
        .from('expenses')
        .select('amount')
        .eq('outlet_id', selectedOutlet.id)
        .eq('status', 'approved')
        .gte('created_at', monthStart);

      const monthSales = monthTx?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
      const monthExpenses = monthExp?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      setStats({
        todaySales,
        todayTransactions,
        todayExpenses,
        profit: monthSales - monthExpenses
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-warm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const getRoleLabel = () => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'pengadaan': return 'Pengadaan';
      case 'gudang': return 'Gudang';
      case 'peracikan_bumbu': return 'Peracikan Bumbu';
      case 'unit_produksi': return 'Unit Produksi';
      case 'owner': return 'Owner';
      case 'manager': return 'Manager';
      case 'staff': return 'Staff';
      case 'investor': return 'Investor';
      default: return 'No Role Assigned';
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['super_admin', 'owner', 'pengadaan', 'gudang', 'peracikan_bumbu', 'unit_produksi', 'manager', 'staff', 'investor'] },
    { icon: ShoppingCart, label: 'POS / Kasir', href: '/pos', roles: ['super_admin', 'owner', 'manager', 'staff'] },
    { icon: Package, label: 'Gudang', href: '/warehouse', roles: ['super_admin', 'owner', 'pengadaan', 'gudang', 'peracikan_bumbu', 'unit_produksi', 'manager', 'staff'] },
    { icon: Receipt, label: 'Transaksi', href: '/transactions', roles: ['super_admin', 'owner', 'pengadaan', 'manager', 'investor'] },
    { icon: BarChart3, label: 'Laporan', href: '/reports', roles: ['super_admin', 'owner', 'pengadaan', 'manager', 'investor'] },
    { icon: Users, label: 'Pengguna', href: '/users', roles: ['super_admin', 'owner'] },
  ];

  const visibleMenus = menuItems.filter(item => role && item.roles.includes(role));

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Welcome Tour for New Users */}
      <WelcomeTour />

      {/* Header */}
      <header className="bg-sidebar text-sidebar-foreground shadow-medium">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-transparent flex items-center justify-center">
              <img src="/logo.jpg" alt="Veroprise Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold">Veroprise ERP</h1>
              <p className="text-xs text-sidebar-foreground/70">Enterprise Resource Planning</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{profile?.full_name || user.email}</p>
              <p className="text-xs text-sidebar-foreground/70">{getRoleLabel()}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-sidebar-foreground hover:bg-sidebar-accent">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!role ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Menunggu Persetujuan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                Akun Anda belum memiliki role. Hubungi admin untuk mendapatkan akses ke sistem.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <h2 className="font-display text-2xl font-semibold mb-6">Selamat Datang, {profile?.full_name?.split(' ')[0] || 'User'}!</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {visibleMenus.map((item) => (
                <Link to={item.href} key={item.href}>
                  <Card className="card-elevated cursor-pointer hover:border-primary transition-all group h-full">
                    <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-primary transition-colors">
                        <item.icon className="h-7 w-7 text-secondary-foreground group-hover:text-primary-foreground transition-colors" />
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Quick Stats for Owner/Manager */}
            {(role === 'owner' || role === 'super_admin' || role === 'manager' || role === 'pengadaan') && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="stat-card">
                  <span className="stat-label">Penjualan Hari Ini</span>
                  <span className="stat-value">
                    {statsLoading ? '...' : formatCurrency(stats.todaySales)}
                  </span>
                </Card>
                <Card className="stat-card">
                  <span className="stat-label">Transaksi</span>
                  <span className="stat-value">
                    {statsLoading ? '...' : stats.todayTransactions}
                  </span>
                </Card>
                <Card className="stat-card">
                  <span className="stat-label">Pengeluaran</span>
                  <span className="stat-value">
                    {statsLoading ? '...' : formatCurrency(stats.todayExpenses)}
                  </span>
                </Card>
                <Card className="stat-card">
                  <span className="stat-label">Profit</span>
                  <span className="stat-value">
                    {statsLoading ? '...' : formatCurrency(stats.profit)}
                  </span>
                </Card>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

