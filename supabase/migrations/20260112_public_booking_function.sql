-- Create a function to handle public booking submissions (bypassing RLS)
CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_outlet_id UUID,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_slot_time TIMESTAMPTZ,
  p_payment_amount NUMERIC DEFAULT 10000.00
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
  v_result JSON;
BEGIN
  -- Insert booking
  INSERT INTO public.bookings (
    outlet_id,
    customer_name,
    customer_email,
    customer_phone,
    slot_time,
    status,
    payment_status,
    payment_amount,
    payment_method
  ) VALUES (
    p_outlet_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_slot_time,
    'pending',
    'unpaid',
    p_payment_amount,
    'qris'
  )
  RETURNING id INTO v_booking_id;

  -- Return success
  SELECT json_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'message', 'Booking berhasil dibuat'
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute to anon users for public bookings
GRANT EXECUTE ON FUNCTION public.create_public_booking TO anon;
GRANT EXECUTE ON FUNCTION public.create_public_booking TO authenticated;

COMMENT ON FUNCTION public.create_public_booking IS 'Allow public booking creation from customer-facing website';
