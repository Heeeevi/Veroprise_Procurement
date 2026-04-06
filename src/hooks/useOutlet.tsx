import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Outlet } from '@/types/database';

interface OutletContextType {
  outlets: Outlet[];
  selectedOutlet: Outlet | null;
  setSelectedOutlet: (outlet: Outlet | null) => void;
  userOutlets: Outlet[];
  loading: boolean;
  refetch: () => Promise<void>;
}

const OutletContext = createContext<OutletContextType | undefined>(undefined);

export function OutletProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [userOutlets, setUserOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOutlets = async () => {
    if (!user) {
      setOutlets([]);
      setUserOutlets([]);
      setSelectedOutlet(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch all outlets
      const { data: allOutlets } = await supabase
        .from('outlets')
        .select('*')
        .eq('status', 'active')
        .order('name');

      const outletData = (allOutlets || []) as unknown as Outlet[];
      setOutlets(outletData);

      // Global roles can see all outlets.
      if (role === 'owner' || role === 'super_admin' || role === 'investor') {
        setUserOutlets(outletData);
        if (outletData.length > 0 && !selectedOutlet) {
          setSelectedOutlet(outletData[0]);
        }
      } else if (user) {
        // For managers/staff, fetch their assigned outlets
        const { data: assignments } = await supabase
          .from('user_outlets')
          .select('outlet_id')
          .eq('user_id', user.id);

        if (assignments) {
          const assignedIds = assignments.map((a) => a.outlet_id);
          const assignedOutlets = outletData.filter((o) => assignedIds.includes(o.id));
          setUserOutlets(assignedOutlets);
          if (assignedOutlets.length > 0 && !selectedOutlet) {
            setSelectedOutlet(assignedOutlets[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching outlets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
  }, [user, role]);

  const value: OutletContextType = {
    outlets,
    selectedOutlet,
    setSelectedOutlet,
    userOutlets,
    loading,
    refetch: fetchOutlets,
  };

  return <OutletContext.Provider value={value}>{children}</OutletContext.Provider>;
}

export function useOutlet() {
  const context = useContext(OutletContext);
  if (context === undefined) {
    throw new Error('useOutlet must be used within an OutletProvider');
  }
  return context;
}
