-- Backfill Expenses for existing Received Purchase Orders
-- This ensures that POs received BEFORE the automation logic was added still get recorded as expenses.

DO $$
DECLARE
    po_record RECORD;
    expense_category_id UUID;
BEGIN
    -- 1. Get or Create 'Inventory Purchase' category
    SELECT id INTO expense_category_id FROM public.expense_categories WHERE name = 'Inventory Purchase';
    
    IF expense_category_id IS NULL THEN
        INSERT INTO public.expense_categories (name, description, color)
        VALUES ('Inventory Purchase', 'Auto-generated from PO', '#3b82f6')
        RETURNING id INTO expense_category_id;
    END IF;

    -- 2. Loop through all RECEIVED POs that don't have a corresponding expense
    -- We assume description contains the PO ID as identifier
    FOR po_record IN 
        SELECT po.*, v.name as vendor_name 
        FROM public.purchase_orders po
        LEFT JOIN public.vendors v ON po.vendor_id = v.id
        WHERE po.status = 'received'
        AND po.total_amount > 0
    LOOP
        -- Check if expense already exists for this PO (checking mostly by amount and date to avoid dupes, or looking for specific note)
        -- A better way is to check if we already have an expense created for this PO.
        -- Since we didn't store PO ID in expenses explicitly before, we'll check if an expense with similar description exists.
        
        IF NOT EXISTS (
            SELECT 1 FROM public.expenses 
            WHERE description LIKE 'Purchase Order #' || substring(po_record.id::text, 1, 8) || '%'
        ) THEN
            -- Insert Expense
            INSERT INTO public.expenses (
                outlet_id,
                user_id, -- We use the PO creator or NULL
                category_id,
                amount,
                description,
                expense_date,
                status,
                notes,
                created_at,
                updated_at
            ) VALUES (
                po_record.outlet_id,
                po_record.created_by,
                expense_category_id,
                po_record.total_amount,
                'Purchase Order #' || substring(po_record.id::text, 1, 8) || ' - ' || COALESCE(po_record.vendor_name, 'Unknown Vendor'),
                COALESCE(po_record.updated_at::date, CURRENT_DATE), -- Use PO received date (updated_at)
                'approved',
                'Backfilled Expense for existing PO',
                now(),
                now()
            );
        END IF;
    END LOOP;
END $$;
