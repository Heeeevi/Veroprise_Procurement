-- Create bookings table for barbershop appointment system
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    slot_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'canceled')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    payment_amount NUMERIC(10, 2) DEFAULT 10000.00,
    payment_method TEXT DEFAULT 'qris',
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_bookings_outlet ON public.bookings(outlet_id);
CREATE INDEX idx_bookings_slot ON public.bookings(slot_time);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_email ON public.bookings(customer_email);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view bookings for their outlets
CREATE POLICY "Users can view bookings for their outlets"
    ON public.bookings
    FOR SELECT
    USING (
        outlet_id IN (
            SELECT outlet_id FROM public.user_outlets WHERE user_id = auth.uid()
        )
    );

-- Policy: Allow authenticated users to insert bookings
CREATE POLICY "Users can create bookings"
    ON public.bookings
    FOR INSERT
    WITH CHECK (
        outlet_id IN (
            SELECT outlet_id FROM public.user_outlets WHERE user_id = auth.uid()
        )
    );

-- Policy: Allow authenticated users to update bookings for their outlets
CREATE POLICY "Users can update bookings for their outlets"
    ON public.bookings
    FOR UPDATE
    USING (
        outlet_id IN (
            SELECT outlet_id FROM public.user_outlets WHERE user_id = auth.uid()
        )
    );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bookings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp
CREATE TRIGGER trigger_update_bookings_timestamp
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_bookings_timestamp();

-- Create a view for booking statistics
CREATE OR REPLACE VIEW public.booking_stats AS
SELECT
    outlet_id,
    DATE(slot_time) as booking_date,
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
    COUNT(*) FILTER (WHERE status = 'canceled') as canceled_bookings,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_bookings,
    SUM(CASE WHEN payment_status = 'paid' THEN payment_amount ELSE 0 END) as total_revenue
FROM public.bookings
GROUP BY outlet_id, DATE(slot_time);

COMMENT ON TABLE public.bookings IS 'Barbershop appointment bookings with payment tracking';
COMMENT ON COLUMN public.bookings.slot_time IS 'Scheduled appointment time';
COMMENT ON COLUMN public.bookings.payment_amount IS 'Booking fee (default 10000 IDR)';
COMMENT ON COLUMN public.bookings.transaction_id IS 'Link to transaction record when payment is confirmed';
