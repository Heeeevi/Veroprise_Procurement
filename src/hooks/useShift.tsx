import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOutlet } from './useOutlet';
import type { Shift } from '@/types/database';
import { useToast } from './use-toast';

interface ShiftContextType {
  currentShift: Shift | null;
  loading: boolean;
  startShift: (openingCash: number) => Promise<boolean>;
  endShift: (closingCash: number, notes?: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { selectedOutlet } = useOutlet();
  const { toast } = useToast();
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentShift = async () => {
    if (!user || !selectedOutlet) {
      setCurrentShift(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('pos_shifts')
        .select('*')
        .eq('user_id', user.id)
        .eq('outlet_id', selectedOutlet.id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      setCurrentShift(data as unknown as Shift | null);
    } catch {
      setCurrentShift(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentShift();
  }, [user, selectedOutlet]);

  const startShift = async (openingCash: number): Promise<boolean> => {
    if (!user || !selectedOutlet) {
      toast({ title: 'Error', description: 'User atau outlet tidak ditemukan', variant: 'destructive' });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('pos_shifts')
        .insert({
          user_id: user.id,
          outlet_id: selectedOutlet.id,
          opening_cash: openingCash,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentShift(data as unknown as Shift);

      // Auto-attendance: Check if user is an employee and create attendance record
      // 1. Find employee record for this user
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('outlet_id', selectedOutlet.id)
        .single();

      if (employee) {
        // 2. Create attendance
        const { error: attError } = await supabase
          .from('attendances')
          .insert({
            outlet_id: selectedOutlet.id,
            employee_id: employee.id,
            shift_id: data.id,
            attendance_date: new Date().toISOString().split('T')[0],
            check_in: new Date().toISOString(),
            status: 'present',
          });

        if (attError) {
          console.error('Error creating linked attendance:', attError);
          // Don't fail the shift start just because attendance failed, but maybe warn?
        }
      }

      toast({ title: 'Shift dimulai', description: 'Selamat bekerja! Absensi telah dicatat.' });
      return true;
    } catch (error) {
      console.error('Error starting shift:', error);
      toast({ title: 'Error', description: 'Gagal memulai shift', variant: 'destructive' });
      return false;
    }
  };

  const endShift = async (closingCash: number, notes?: string): Promise<boolean> => {
    if (!currentShift) {
      toast({ title: 'Error', description: 'Tidak ada shift aktif', variant: 'destructive' });
      return false;
    }

    try {
      const { error } = await supabase
        .from('pos_shifts')
        .update({
          ended_at: new Date().toISOString(),
          closing_cash: closingCash,
          notes,
        })
        .eq('id', currentShift.id);

      if (error) throw error;

      // Auto-attendance: Clock out
      // Find attendance linked to this shift
      const { data: attendance } = await supabase
        .from('attendances')
        .select('id')
        .eq('shift_id', currentShift.id)
        .single();

      if (attendance) {
        await supabase
          .from('attendances')
          .update({
            check_out: new Date().toISOString()
          })
          .eq('id', attendance.id);
      }

      setCurrentShift(null);
      toast({ title: 'Shift selesai', description: 'Terima kasih atas kerja kerasnya!' });
      return true;
    } catch (error) {
      console.error('Error ending shift:', error);
      toast({ title: 'Error', description: 'Gagal mengakhiri shift', variant: 'destructive' });
      return false;
    }
  };

  const value: ShiftContextType = {
    currentShift,
    loading,
    startShift,
    endShift,
    refetch: fetchCurrentShift,
  };

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}

export function useShift() {
  const context = useContext(ShiftContext);
  if (context === undefined) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
}
