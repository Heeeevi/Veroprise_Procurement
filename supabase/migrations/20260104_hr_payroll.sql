-- Create Employees Table
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    nik TEXT,
    job_position TEXT NOT NULL, -- e.g. 'Barista', 'Chef'
    base_salary NUMERIC DEFAULT 0,
    join_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
    user_id UUID REFERENCES auth.users(id), -- Link to system user if they have login access
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Attendance Logs Table
CREATE TABLE public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'present' CHECK (status IN ('present', 'late', 'sick', 'leave', 'absent')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Payroll Runs Table (Monthly Batches)
CREATE TABLE public.payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE,
    period TEXT NOT NULL, -- Format: 'YYYY-MM'
    total_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
    created_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Payroll Items Table (Individual Slips)
CREATE TABLE public.payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE RESTRICT,
    base_salary NUMERIC DEFAULT 0,
    allowances NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    net_salary NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

-- Employees Policies
CREATE POLICY "View employees" ON public.employees FOR SELECT USING (true); -- Publicly viewable for internal tools, or restrict to auth
-- Better: Only outlet owners/managers can view/edit
CREATE POLICY "Managers manage employees" ON public.employees
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('owner', 'manager')
        )
    );

-- Attendance Policies
CREATE POLICY "View attendance" ON public.attendance_logs FOR SELECT USING (true);
CREATE POLICY "Managers manage attendance" ON public.attendance_logs
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('owner', 'manager')
        )
    );
-- Staff can insert their own attendance (if we implement self-clock-in)
CREATE POLICY "Staff clock in" ON public.attendance_logs FOR INSERT
    WITH CHECK (true); -- Ideally restrict by user_id link in employees table

-- Payroll Policies (Strict)
CREATE POLICY "Managers manage payroll" ON public.payroll_runs
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('owner', 'manager')
        )
    );
CREATE POLICY "Managers manage payroll items" ON public.payroll_items
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('owner', 'manager')
        )
    );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
