import { ReactNode } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOutlet } from '@/hooks/useOutlet';
import { 
  Coffee, LayoutDashboard, ShoppingCart, Package, Receipt, 
  Users, Settings, BarChart3, LogOut, Menu, ChevronDown, Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['owner', 'manager', 'staff', 'investor'] },
  { icon: ShoppingCart, label: 'POS / Kasir', href: '/pos', roles: ['owner', 'manager', 'staff'] },
  { icon: Package, label: 'Inventory', href: '/inventory', roles: ['owner', 'manager', 'staff'] },
  { icon: Receipt, label: 'Transaksi', href: '/transactions', roles: ['owner', 'manager', 'investor'] },
  { icon: BarChart3, label: 'Laporan', href: '/reports', roles: ['owner', 'manager', 'investor'] },
  { icon: Users, label: 'Pengguna', href: '/users', roles: ['owner'] },
  { icon: Settings, label: 'Pengaturan', href: '/settings', roles: ['owner', 'manager'] },
];

export default function MainLayout({ children }: MainLayoutProps) {
  const { user, profile, role, loading, signOut } = useAuth();
  const { userOutlets, selectedOutlet, setSelectedOutlet } = useOutlet();
  const location = useLocation();

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

  const visibleMenus = menuItems.filter(item => role && item.roles.includes(role));

  const getRoleLabel = () => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'manager': return 'Manager';
      case 'staff': return 'Staff';
      case 'investor': return 'Investor';
      default: return 'No Role';
    }
  };

  const NavLinks = () => (
    <nav className="space-y-1">
      {visibleMenus.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
              isActive 
                ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sidebar-primary rounded-xl flex items-center justify-center">
              <Coffee className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold">Coffee ERP</h1>
              <p className="text-xs text-sidebar-foreground/70">Mini ERP System</p>
            </div>
          </Link>
        </div>

        {/* Outlet Selector */}
        {userOutlets.length > 0 && (
          <div className="p-4 border-b border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between text-sidebar-foreground hover:bg-sidebar-accent">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    <span className="truncate">{selectedOutlet?.name || 'Pilih Outlet'}</span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Pilih Outlet</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {userOutlets.map((outlet) => (
                  <DropdownMenuItem
                    key={outlet.id}
                    onClick={() => setSelectedOutlet(outlet)}
                    className={cn(selectedOutlet?.id === outlet.id && "bg-accent")}
                  >
                    {outlet.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <NavLinks />
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-medium">{profile?.full_name?.charAt(0) || 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{profile?.full_name || user.email}</p>
              <p className="text-xs text-sidebar-foreground/70">{getRoleLabel()}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={signOut} 
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden bg-sidebar text-sidebar-foreground p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
                <div className="p-4 border-b border-sidebar-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sidebar-primary rounded-xl flex items-center justify-center">
                      <Coffee className="h-5 w-5 text-sidebar-primary-foreground" />
                    </div>
                    <div>
                      <h1 className="font-display text-lg font-semibold text-sidebar-foreground">Coffee ERP</h1>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <NavLinks />
                </div>
              </SheetContent>
            </Sheet>
            <span className="font-display font-semibold">Coffee ERP</span>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="text-sidebar-foreground">
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
