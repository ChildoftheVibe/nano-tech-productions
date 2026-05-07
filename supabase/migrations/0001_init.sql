-- ALBUMS TABLE
CREATE TABLE albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  release_date DATE,
  cover_image TEXT,
  background_color TEXT DEFAULT '#393838',
  accent_color TEXT DEFAULT '#3DD6C8',
  spotify_url TEXT,
  apple_music_url TEXT,
  youtube_url TEXT,
  amazon_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRACKS TABLE
CREATE TABLE tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  track_number INTEGER,
  duration TEXT,
  price DECIMAL(10,2) DEFAULT 1.00,
  audio_url TEXT,
  is_downloadable BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,
  features TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DISCOUNT CODES TABLE
CREATE TABLE discount_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  applies_to TEXT NOT NULL CHECK (applies_to IN ('single', 'album', 'all')),
  album_id UUID REFERENCES albums(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDERS TABLE
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paypal_order_id TEXT UNIQUE NOT NULL,
  customer_email TEXT,
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  discount_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PLAYLIST TABLE (for the continuous shuffle)
CREATE TABLE playlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER,
  is_active BOOLEAN DEFAULT true,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist ENABLE ROW LEVEL SECURITY;

-- Public can READ published albums and tracks
CREATE POLICY "Public read published albums" ON albums FOR SELECT USING (is_published = true);
CREATE POLICY "Public read published tracks" ON tracks FOR SELECT USING (is_published = true);
CREATE POLICY "Public read active playlist" ON playlist FOR SELECT USING (is_active = true);

-- Service role has full access (for admin dashboard)
CREATE POLICY "Service role full access albums" ON albums USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access tracks" ON tracks USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access discounts" ON discount_codes USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access orders" ON orders USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access playlist" ON playlist USING (auth.role() = 'service_role');
