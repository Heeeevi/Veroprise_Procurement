import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { OutletProvider } from "@/hooks/useOutlet";
import { ShiftProvider } from "@/hooks/useShift";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Transactions from "./pages/Transactions";
import Inventory from "./pages/Inventory";
import Products from "./pages/Products";
import Vendors from "./pages/Vendors";
import PurchaseOrders from "./pages/PurchaseOrders";
import PurchaseOrderDetail from "./pages/PurchaseOrderDetail";
import HRPage from "./pages/HR";
import Warehouse from "./pages/Warehouse";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import JobCards from "./pages/manufacturing/JobCards";
import Disassembly from "./pages/manufacturing/Disassembly";
import StockTransactions from "./pages/StockTransactions";
import BomManagement from "./pages/manufacturing/BomManagement";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import DeliveryRouting from "./pages/DeliveryRouting";
import ProductionPlanning from "./pages/manufacturing/ProductionPlanning";
import WorkOrders from "./pages/manufacturing/WorkOrders";
import Inbound from "./pages/Inbound";
import Reconciliation from "./pages/Reconciliation";
// BOOKING FEATURE DISABLED
// import Bookings from "./pages/Bookings";
// import PublicBooking from "./pages/PublicBooking";
import Settings from "./pages/Settings";
import TestPage from "./pages/TestPage";
import NotFound from "./pages/NotFound";
import ComingSoon from "./pages/ComingSoon";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OutletProvider>
            <ShiftProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/test" element={<TestPage />} />
                {/* BOOKING ROUTES DISABLED */}
                {/* <Route path="/book" element={<PublicBooking />} /> */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/pos" element={<POS />} /> {/* Kept functional route */}
                
                {/* BUYING */}
                <Route path="/buying/suppliers" element={<Vendors />} />
                <Route path="/buying/purchase-orders" element={<PurchaseOrders />} />
                <Route path="/buying/purchase-orders/:id" element={<PurchaseOrderDetail />} />
                <Route path="/buying/inbound" element={<Inbound />} />
                
                {/* SELLING */}
                <Route path="/selling/sales-orders" element={<Transactions />} />
                <Route path="/selling/invoices" element={<Invoices />} />
                <Route path="/selling/payments" element={<Payments />} />
                <Route path="/selling/delivery" element={<DeliveryRouting />} />

                {/* STOCK */}
                <Route path="/stock/tracking" element={<Inventory />} />
                <Route path="/stock/items" element={<Products />} />
                <Route path="/stock/transactions" element={<StockTransactions />} />
                <Route path="/stock/reconciliation" element={<Reconciliation />} />

                {/* MANUFACTURING */}
                <Route path="/manufacturing/job-cards" element={<JobCards />} />
                <Route path="/manufacturing/disassembly" element={<Disassembly />} />
                <Route path="/manufacturing/bom" element={<BomManagement />} />
                <Route path="/manufacturing/work-orders" element={<WorkOrders />} />
                <Route path="/manufacturing/planning" element={<ProductionPlanning />} />
                <Route path="/manufacturing/inventory" element={<Inventory />} />

                {/* OTHER MENU */}
                <Route path="/users" element={<Users />} />
                <Route path="/settings" element={<Settings />} />

                {/* Legacy Redirects */}
                <Route path="/transactions" element={<Navigate to="/selling/sales-orders" replace />} />
                <Route path="/products" element={<Navigate to="/stock/items" replace />} />
                <Route path="/warehouse" element={<Navigate to="/stock/tracking" replace />} />
                <Route path="/warehouse/inventory" element={<Navigate to="/stock/tracking" replace />} />
                <Route path="/warehouse/vendors" element={<Navigate to="/buying/suppliers" replace />} />
                <Route path="/warehouse/purchase-orders" element={<Navigate to="/buying/purchase-orders" replace />} />
                <Route path="/warehouse/purchase-orders/:id" element={<PurchaseOrderDetail />} />
                <Route path="/inventory" element={<Navigate to="/stock/tracking" replace />} />
                <Route path="/inventory/vendors" element={<Navigate to="/buying/suppliers" replace />} />
                <Route path="/inventory/purchase-orders" element={<Navigate to="/buying/purchase-orders" replace />} />
                
                {/* Unlisted in new menu but kept functional */}
                <Route path="/hr" element={<HRPage />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ShiftProvider>
          </OutletProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
