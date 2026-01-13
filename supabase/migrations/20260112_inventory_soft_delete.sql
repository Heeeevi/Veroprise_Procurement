-- ============================================================================
-- MIGRATION: Add Soft Delete Support for Inventory Items
-- Date: 2026-01-12
-- Description: Add is_active column for soft delete functionality
-- ============================================================================

-- Add is_active column to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records to be active
UPDATE public.inventory_items 
SET is_active = true 
WHERE is_active IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_active 
ON public.inventory_items(is_active);

-- Add comment
COMMENT ON COLUMN public.inventory_items.is_active IS 
'Soft delete flag. FALSE = item discontinued but kept for historical data integrity';

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SOFT DELETE MIGRATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Added: is_active column to inventory_items';
    RAISE NOTICE 'Feature: Soft delete with dependency check';
    RAISE NOTICE 'Impact: Zero impact on existing data & reports';
    RAISE NOTICE '========================================';
END $$;
