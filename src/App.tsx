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
// BOOKING FEATURE DISABLED
// import Bookings from "./pages/Bookings";
// import PublicBooking from "./pages/PublicBooking";
import Settings from "./pages/Settings";
import TestPage from "./pages/TestPage";
import NotFound from "./pages/NotFound";

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
                <Route path="/pos" element={<POS />} />
                {/* <Route path="/bookings" element={<Bookings />} /> */}
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/products" element={<Products />} />
                <Route path="/warehouse" element={<Warehouse />} />
                <Route path="/warehouse/inventory" element={<Inventory />} />
                <Route path="/warehouse/vendors" element={<Vendors />} />
                <Route path="/warehouse/purchase-orders" element={<PurchaseOrders />} />
                <Route path="/warehouse/purchase-orders/:id" element={<PurchaseOrderDetail />} />
                <Route path="/inventory" element={<Navigate to="/warehouse/inventory" replace />} />
                <Route path="/inventory/vendors" element={<Navigate to="/warehouse/vendors" replace />} />
                <Route path="/inventory/purchase-orders" element={<Navigate to="/warehouse/purchase-orders" replace />} />
                <Route path="/inventory/purchase-orders/:id" element={<PurchaseOrderDetail />} />
                <Route path="/hr" element={<HRPage />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/users" element={<Users />} />
                <Route path="/settings" element={<Settings />} />
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
