-- Create function to auto-assign owner role to first user
CREATE OR REPLACE FUNCTION public.auto_assign_first_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Count existing users
    SELECT COUNT(*) INTO user_count FROM public.user_roles;
    
    -- If this is the first user, make them owner
    IF user_count = 0 THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.user_id, 'owner');
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to run after profile is created
CREATE TRIGGER auto_assign_owner_on_first_signup
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.auto_assign_first_owner();

-- Insert sample products for demo
INSERT INTO public.products (category_id, name, description, price, cost_price) VALUES
    ((SELECT id FROM categories WHERE name = 'Coffee'), 'Espresso', 'Single shot espresso', 18000, 5000),
    ((SELECT id FROM categories WHERE name = 'Coffee'), 'Americano', 'Espresso with hot water', 22000, 6000),
    ((SELECT id FROM categories WHERE name = 'Coffee'), 'Cappuccino', 'Espresso with steamed milk foam', 28000, 8000),
    ((SELECT id FROM categories WHERE name = 'Coffee'), 'Latte', 'Espresso with steamed milk', 28000, 8000),
    ((SELECT id FROM categories WHERE name = 'Coffee'), 'Mocha', 'Espresso with chocolate and milk', 32000, 10000),
    ((SELECT id FROM categories WHERE name = 'Coffee'), 'Caramel Macchiato', 'Espresso with vanilla, milk, and caramel', 35000, 11000),
    ((SELECT id FROM categories WHERE name = 'Non-Coffee'), 'Hot Chocolate', 'Rich chocolate drink', 25000, 7000),
    ((SELECT id FROM categories WHERE name = 'Non-Coffee'), 'Matcha Latte', 'Japanese green tea with milk', 30000, 10000),
    ((SELECT id FROM categories WHERE name = 'Tea'), 'Earl Grey', 'Classic black tea', 18000, 4000),
    ((SELECT id FROM categories WHERE name = 'Tea'), 'Chamomile', 'Herbal tea', 18000, 4000),
    ((SELECT id FROM categories WHERE name = 'Tea'), 'Green Tea', 'Japanese green tea', 18000, 4000),
    ((SELECT id FROM categories WHERE name = 'Food'), 'Croissant', 'Butter croissant', 25000, 10000),
    ((SELECT id FROM categories WHERE name = 'Food'), 'Sandwich', 'Ham and cheese sandwich', 35000, 15000),
    ((SELECT id FROM categories WHERE name = 'Food'), 'Banana Bread', 'Homemade banana bread', 22000, 8000),
    ((SELECT id FROM categories WHERE name = 'Snacks'), 'Cookies', 'Chocolate chip cookies (3pcs)', 18000, 6000),
    ((SELECT id FROM categories WHERE name = 'Snacks'), 'Brownies', 'Fudge brownies', 20000, 7000);

-- Insert sample outlet
INSERT INTO public.outlets (name, address, phone) VALUES
    ('Outlet Pusat', 'Jl. Sudirman No. 123, Jakarta', '021-1234567');

-- Insert sample inventory items
INSERT INTO public.inventory_items (name, unit, min_stock, current_stock, cost_per_unit) VALUES
    ('Biji Kopi Arabica', 'kg', 5, 20, 150000),
    ('Biji Kopi Robusta', 'kg', 5, 15, 100000),
    ('Susu Full Cream', 'liter', 10, 50, 18000),
    ('Susu Oat', 'liter', 5, 20, 35000),
    ('Gula Pasir', 'kg', 3, 10, 15000),
    ('Sirup Vanilla', 'bottle', 2, 8, 85000),
    ('Sirup Caramel', 'bottle', 2, 8, 85000),
    ('Sirup Hazelnut', 'bottle', 2, 6, 85000),
    ('Bubuk Coklat', 'kg', 2, 5, 120000),
    ('Matcha Powder', 'kg', 1, 3, 250000),
    ('Cup Paper 8oz', 'pcs', 100, 500, 800),
    ('Cup Paper 12oz', 'pcs', 100, 500, 1000),
    ('Cup Plastic 16oz', 'pcs', 100, 400, 1200),
    ('Lid Cup', 'pcs', 200, 800, 300),
    ('Tissue', 'pack', 10, 30, 5000);