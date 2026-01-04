-- Partner Vendors (Rekomendasi Vendor dari Veroprise)
-- Ini adalah vendor yang sudah diverifikasi dan direkomendasikan oleh Veroprise

CREATE TABLE public.partner_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    category TEXT NOT NULL, -- 'coffee_beans', 'syrup', 'packaging', 'equipment', 'pharmacy', 'retail'
    business_types TEXT[] NOT NULL DEFAULT '{}', -- Array: ['fnb', 'coffee_shop', 'retail', 'pharmacy']
    description TEXT,
    contact_whatsapp TEXT,
    contact_email TEXT,
    website_url TEXT,
    address TEXT,
    is_featured BOOLEAN DEFAULT false, -- Untuk highlight di atas
    is_active BOOLEAN DEFAULT true,
    badge TEXT DEFAULT 'verified', -- 'verified', 'premium', 'exclusive'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.partner_vendors ENABLE ROW LEVEL SECURITY;

-- Semua user bisa lihat partner vendors
CREATE POLICY "Anyone can view partner vendors" ON public.partner_vendors
    FOR SELECT USING (is_active = true);

-- Seed Data - Contoh Partner Vendors untuk Coffee Shop
INSERT INTO public.partner_vendors (name, category, business_types, description, contact_whatsapp, website_url, is_featured, badge) VALUES
(
    'Kopi Nusantara Supplier',
    'coffee_beans',
    ARRAY['fnb', 'coffee_shop'],
    'Supplier biji kopi arabika dan robusta premium dari berbagai daerah di Indonesia. Tersedia green bean dan roasted bean.',
    '6281234567890',
    'https://kopinusantara.id',
    true,
    'premium'
),
(
    'SirupMania Indonesia',
    'syrup',
    ARRAY['fnb', 'coffee_shop'],
    'Produsen sirup berkualitas untuk minuman kopi dan mocktail. Rasa vanilla, hazelnut, caramel, dan 20+ varian lainnya.',
    '6281234567891',
    'https://sirupmania.com',
    true,
    'verified'
),
(
    'PackPro Packaging',
    'packaging',
    ARRAY['fnb', 'coffee_shop', 'retail'],
    'Solusi kemasan ramah lingkungan untuk bisnis F&B. Cup, lid, paper bag, dan custom packaging.',
    '6281234567892',
    'https://packpro.id',
    false,
    'verified'
),
(
    'Mesin Kopi Jaya',
    'equipment',
    ARRAY['fnb', 'coffee_shop'],
    'Distributor resmi mesin espresso, grinder, dan peralatan barista. Garansi resmi dan service center.',
    '6281234567893',
    'https://mesinkopijaya.com',
    true,
    'exclusive'
),
(
    'PT Apotek Farma Distribusi',
    'pharmacy',
    ARRAY['pharmacy'],
    'Distributor obat-obatan dan alat kesehatan untuk apotek. Produk BPOM dan harga kompetitif.',
    '6281234567894',
    'https://farmadistribusi.co.id',
    true,
    'premium'
),
(
    'Retail Supply Co.',
    'retail_supply',
    ARRAY['retail'],
    'Supplier perlengkapan toko retail: rak display, price tag, barcode scanner, dan POS hardware.',
    '6281234567895',
    'https://retailsupply.id',
    false,
    'verified'
);
