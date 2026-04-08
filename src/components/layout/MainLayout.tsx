import { ReactNode } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOutlet } from '@/hooks/useOutlet';
import {
  LayoutDashboard, ShoppingCart, Receipt,
  Users, BarChart3, LogOut, Menu, ChevronDown, Store, Tag, Settings, Warehouse
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import HelpGuide from '@/components/HelpGuide';
import StockNotifications from '@/components/StockNotifications';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

interface MenuItemChild {
  label: string;
  href: string;
  roles?: string[];
}

interface MenuItem {
  icon: any;
  label: string;
  href?: string;
  roles: string[];
  children?: MenuItemChild[];
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['super_admin', 'owner', 'manager', 'pengadaan', 'gudang', 'peracikan_bumbu', 'staff'] },
  
  {
    icon: ShoppingCart, label: 'Buying', roles: ['super_admin', 'owner', 'manager', 'pengadaan'],
    children: [
      { label: 'Supplier Management', href: '/buying/suppliers' },
      { label: 'Purchase Orders', href: '/buying/purchase-orders' },
      { label: 'Stock Management (Purchase Receive)', href: '/buying/inbound' },
    ]
  },

  {
    icon: Receipt, label: 'Selling', roles: ['super_admin', 'owner', 'manager', 'gudang', 'peracikan_bumbu'],
    children: [
      { label: 'Sales Orders', href: '/selling/sales-orders', roles: ['super_admin', 'owner', 'manager', 'peracikan_bumbu'] }, // Staff Premixture
      { label: 'Invoice (Outbound)', href: '/selling/invoices', roles: ['super_admin', 'owner', 'manager', 'gudang'] }, // Staff Warehouse
      { label: 'Payment Entry', href: '/selling/payments', roles: ['super_admin', 'owner', 'manager'] },
      { label: 'Delivery & Route', href: '/selling/delivery', roles: ['super_admin', 'owner', 'manager', 'gudang'] },
    ]
  },

  {
    icon: Warehouse, label: 'Stock', roles: ['super_admin', 'owner', 'manager', 'gudang'],
    children: [
      { label: 'Inventory Tracking (Stock Opname)', href: '/stock/tracking' },
      { label: 'Item Management', href: '/stock/items' },
      { label: 'Stock Transactions', href: '/stock/transactions' },
      { label: 'Stock Reconcilliation', href: '/stock/reconciliation' },
    ]
  },

  {
    icon: Tag, label: 'Manufacturing', roles: ['super_admin', 'owner', 'manager', 'gudang', 'peracikan_bumbu'],
    children: [
      { label: 'Job Cards', href: '/manufacturing/job-cards', roles: ['super_admin', 'owner', 'manager', 'peracikan_bumbu'] },
      { label: 'Bill of Materials', href: '/manufacturing/bom', roles: ['super_admin', 'owner', 'manager', 'peracikan_bumbu'] },
      { label: 'Work Orders', href: '/manufacturing/work-orders', roles: ['super_admin', 'owner', 'manager', 'peracikan_bumbu'] },
      { label: 'Production Planning', href: '/manufacturing/planning', roles: ['super_admin', 'owner', 'manager', 'peracikan_bumbu'] },
      { label: 'Inventory Management', href: '/manufacturing/inventory', roles: ['super_admin', 'owner', 'manager', 'gudang'] },
      { label: 'Disassembly (Aqiqah)', href: '/manufacturing/disassembly', roles: ['super_admin', 'owner', 'manager', 'gudang', 'peracikan_bumbu'] },
    ]
  },

  { icon: Users, label: 'Users & Permissions', href: '/users', roles: ['super_admin', 'owner', 'manager'] },
  { icon: Settings, label: 'System Settings', href: '/settings', roles: ['super_admin', 'owner', 'manager'] },
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
      case 'super_admin': return 'Super Admin';
      case 'owner': return 'Super Admin';
      case 'manager': return 'Manager';
      case 'pengadaan': return 'Staff Purchasing';
      case 'gudang': return 'Staff Warehouse';
      case 'peracikan_bumbu': return 'Staff Premixture';
      case 'unit_produksi': return 'Unit Produksi';
      case 'staff': return 'Staff';
      case 'investor': return 'Investor';
      default: return 'No Role';
    }
  };

  const NavLinks = () => {
    // Determine active parent based on location
    const [openP, setOpenP] = useState<string | null>(() => {
      const parent = visibleMenus.find(v => v.children?.some(c => location.pathname.startsWith(c.href || '')));
      return parent ? parent.label : null;
    });

    return (
      <nav className="space-y-1">
        {visibleMenus.map((item) => {
          if (item.children) {
            const isParentActive = item.children.some(c => location.pathname.startsWith(c.href || ''));
            const isOpen = openP === item.label || isParentActive;

            // Filter visible children based on role (some children have specific override roles)
            const visibleChildren = item.children.filter(child => !child.roles || (role && child.roles.includes(role)));

            if (visibleChildren.length === 0) return null;

            return (
              <Collapsible
                key={item.label}
                open={isOpen}
                onOpenChange={(v) => v ? setOpenP(item.label) : setOpenP(null)}
                className="w-full"
              >
                <CollapsibleTrigger className={cn(
                  "flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors group",
                  isOpen ? "bg-sidebar-accent/50 text-sidebar-foreground font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}>
                  <div className="flex items-center gap-3">
                    <item.icon className={cn("h-5 w-5", isOpen ? "text-primary" : "")} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-1 space-y-1 mt-1">
                  <div className="border-l border-sidebar-border ml-3 pl-3 space-y-1">
                    {visibleChildren.map((child) => {
                      const isActive = location.pathname === child.href || location.pathname.startsWith(`${child.href}/`);
                      return (
                        <Link
                          key={child.href}
                          to={child.href || '#'}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          }

          const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href || item.label}
              to={item.href || '#'}
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
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar - Fixed height, no scroll on main */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:h-screen lg:sticky lg:top-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border flex-shrink-0">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-transparent flex items-center justify-center">
              <img src="/veroprise-logo.jpg" alt="Veroprise Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold">Veroprise ERP</h1>
              <p className="text-xs text-sidebar-foreground/70">Logistics & Procurement Management</p>
            </div>
          </Link>
        </div>

        {/* Outlet Selector */}
        {userOutlets.length > 0 && (
          <div className="p-4 border-b border-sidebar-border flex-shrink-0">
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

        {/* Navigation - scrollable if needed */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <NavLinks />
        </div>

        {/* User Footer - always at bottom */}
        <div className="p-4 border-t border-sidebar-border flex-shrink-0 bg-sidebar">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-medium">{profile?.full_name?.charAt(0) || 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{profile?.full_name || user.email}</p>
              <p className="text-xs text-sidebar-foreground/70">{getRoleLabel()}</p>
            </div>
            <StockNotifications />
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
                    <div className="w-10 h-10 bg-transparent flex items-center justify-center">
                      <img src="/veroprise-logo.jpg" alt="Veroprise Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h1 className="font-display text-lg font-semibold text-sidebar-foreground">Veroprise ERP</h1>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <NavLinks />
                </div>
              </SheetContent>
            </Sheet>
            <span className="font-display font-semibold">Veroprise ERP</span>
          </div>
          <div className="flex items-center gap-1">
            <StockNotifications />
            <Button variant="ghost" size="icon" onClick={signOut} className="text-sidebar-foreground">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>

      {/* Floating Help Guide */}
      <HelpGuide />
    </div>
  );
}
