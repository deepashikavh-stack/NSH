-- ============================================
-- CREATE TRANSLATIONS TABLE
-- ============================================
-- This table stores dynamic UI labels for multi-lingual support.

CREATE TABLE IF NOT EXISTS public.translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    en_val TEXT NOT NULL,
    si_val TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for anon users)
DROP POLICY IF EXISTS "Allow public read translations" ON public.translations;
CREATE POLICY "Allow public read translations" ON public.translations
    FOR SELECT USING (true);

-- Insert initial values for testing
INSERT INTO public.translations (key, en_val, si_val)
VALUES 
    ('common.welcome', 'Welcome', 'සාදරයෙන් පිළිගනිමු'),
    ('kiosk.title', 'Visitor Check-In', 'අමුත්තන් පැමිණීමේ ලියාපදිංචිය')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions
GRANT ALL ON public.translations TO anon, authenticated, postgres, service_role;
