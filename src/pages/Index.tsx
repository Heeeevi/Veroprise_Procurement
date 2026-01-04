import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Coffee, LayoutDashboard, ShoppingCart, Package, Receipt, Users, BarChart3, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Index() {
  const { user, profile, role, loading, signOut } = useAuth();

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
      case 'owner': return 'Owner';
      case 'manager': return 'Manager';
      case 'staff': return 'Staff';
      case 'investor': return 'Investor';
      default: return 'No Role Assigned';
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['owner', 'manager', 'staff', 'investor'] },
    { icon: ShoppingCart, label: 'POS / Kasir', href: '/pos', roles: ['owner', 'manager', 'staff'] },
    { icon: Package, label: 'Inventory', href: '/inventory', roles: ['owner', 'manager', 'staff'] },
    { icon: Receipt, label: 'Transaksi', href: '/transactions', roles: ['owner', 'manager', 'investor'] },
    { icon: BarChart3, label: 'Laporan', href: '/reports', roles: ['owner', 'manager', 'investor'] },
    { icon: Users, label: 'Pengguna', href: '/users', roles: ['owner'] },
  ];

  const visibleMenus = menuItems.filter(item => role && item.roles.includes(role));

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Header */}
      <header className="bg-sidebar text-sidebar-foreground shadow-medium">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-transparent flex items-center justify-center">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold">Veroprise ERP</h1>
              <p className="text-xs text-sidebar-foreground/70">Cloud-Based ERP All-in-One</p>
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
            {(role === 'owner' || role === 'manager') && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="stat-card">
                  <span className="stat-label">Penjualan Hari Ini</span>
                  <span className="stat-value">Rp 0</span>
                </Card>
                <Card className="stat-card">
                  <span className="stat-label">Transaksi</span>
                  <span className="stat-value">0</span>
                </Card>
                <Card className="stat-card">
                  <span className="stat-label">Pengeluaran</span>
                  <span className="stat-value">Rp 0</span>
                </Card>
                <Card className="stat-card">
                  <span className="stat-label">Profit</span>
                  <span className="stat-value">Rp 0</span>
                </Card>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
