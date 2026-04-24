-- Add sku column for Kode Bahan
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;