-- Create perfumes table for scraped data
CREATE TABLE public.perfumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'ZAR',
  amazon_url TEXT,
  amazon_asin TEXT,
  image_url TEXT,
  fragrantica_url TEXT,
  
  -- Fragrance stats
  longevity INTEGER CHECK (longevity >= 1 AND longevity <= 5),
  sillage INTEGER CHECK (sillage >= 1 AND sillage <= 5),
  projection INTEGER CHECK (projection >= 1 AND projection <= 5),
  
  -- Notes and categories
  notes TEXT[], -- Array of fragrance notes
  category TEXT,
  season TEXT[],
  occasion TEXT[],
  
  -- Tracking and analytics
  view_count INTEGER DEFAULT 0,
  affiliate_clicks INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  is_available BOOLEAN DEFAULT true
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfume_id UUID NOT NULL REFERENCES public.perfumes(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  longevity_rating INTEGER CHECK (longevity_rating >= 1 AND longevity_rating <= 5),
  sillage_rating INTEGER CHECK (sillage_rating >= 1 AND sillage_rating <= 5),
  projection_rating INTEGER CHECK (projection_rating >= 1 AND projection_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, perfume_id) -- One review per user per perfume
);

-- Create wishlists table
CREATE TABLE public.wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfume_id UUID NOT NULL REFERENCES public.perfumes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, perfume_id) -- One wishlist item per user per perfume
);

-- Create analytics table for tracking
CREATE TABLE public.analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'view', 'search', 'affiliate_click'
  perfume_id UUID REFERENCES public.perfumes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  search_query TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.perfumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- Perfumes are publicly viewable
CREATE POLICY "Perfumes are publicly viewable" 
ON public.perfumes 
FOR SELECT 
USING (true);

-- Only admins can modify perfumes (for scraped data)
CREATE POLICY "Only admins can modify perfumes" 
ON public.perfumes 
FOR ALL 
USING (false);

-- Profiles policies
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Reviews policies
CREATE POLICY "Reviews are publicly viewable" 
ON public.reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own reviews" 
ON public.reviews 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" 
ON public.reviews 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" 
ON public.reviews 
FOR DELETE 
USING (auth.uid() = user_id);

-- Wishlist policies
CREATE POLICY "Users can view their own wishlist" 
ON public.wishlists 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own wishlist" 
ON public.wishlists 
FOR ALL 
USING (auth.uid() = user_id);

-- Analytics policies (insert only for authenticated users)
CREATE POLICY "Users can create analytics events" 
ON public.analytics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "No one can read analytics" 
ON public.analytics 
FOR SELECT 
USING (false);

-- Create indexes for performance
CREATE INDEX idx_perfumes_brand ON public.perfumes(brand);
CREATE INDEX idx_perfumes_name ON public.perfumes(name);
CREATE INDEX idx_perfumes_notes ON public.perfumes USING GIN(notes);
CREATE INDEX idx_perfumes_category ON public.perfumes(category);
CREATE INDEX idx_reviews_perfume_id ON public.reviews(perfume_id);
CREATE INDEX idx_wishlists_user_id ON public.wishlists(user_id);
CREATE INDEX idx_analytics_event_type ON public.analytics(event_type);
CREATE INDEX idx_analytics_created_at ON public.analytics(created_at);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_perfumes_updated_at
  BEFORE UPDATE ON public.perfumes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample perfume data for testing
INSERT INTO public.perfumes (name, brand, description, price, amazon_url, image_url, longevity, sillage, projection, notes, category, season, occasion) VALUES
('Sauvage Eau de Toilette', 'Dior', 'A fresh and raw composition that plays with juxtaposition. Radiant top notes burst with the juicy freshness of Reggio Calabria Bergamot.', 1250.00, 'https://amazon.co.za/dp/example1', 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400&h=400&fit=crop', 4, 5, 4, ARRAY['Bergamot', 'Sichuan Pepper', 'Cedar', 'Amberwood'], 'Fresh', ARRAY['Spring', 'Summer', 'Fall'], ARRAY['Daily', 'Office', 'Casual']),

('Aventus', 'Creed', 'A fruity and fresh fragrance for men with a woody and musky base. Inspired by the dramatic life of a historic emperor.', 4200.00, 'https://amazon.co.za/dp/example2', 'https://images.unsplash.com/photo-1565030209074-da3958db50b2?w=400&h=400&fit=crop', 5, 5, 5, ARRAY['Pineapple', 'Birch', 'Musk', 'Oakmoss'], 'Fruity', ARRAY['Spring', 'Summer', 'Fall'], ARRAY['Special Events', 'Date Night', 'Office']),

('Black Opium', 'Yves Saint Laurent', 'A seductive feminine fragrance. An intoxicating caffeine shot.', 1680.00, 'https://amazon.co.za/dp/example3', 'https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?w=400&h=400&fit=crop', 4, 4, 3, ARRAY['Coffee', 'Vanilla', 'White Flowers', 'Cedar'], 'Gourmand', ARRAY['Fall', 'Winter'], ARRAY['Evening', 'Date Night', 'Special Events']),

('Oud Wood', 'Tom Ford', 'Exotic and smoky, Oud Wood combines rare oud, sandalwood, and cedarwood creating a sophisticated signature scent.', 3500.00, 'https://amazon.co.za/dp/example4', 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop', 5, 3, 3, ARRAY['Oud', 'Sandalwood', 'Cedar', 'Vanilla'], 'Woody', ARRAY['Fall', 'Winter'], ARRAY['Evening', 'Special Events', 'Formal']),

('Chanel No. 5', 'Chanel', 'The quintessential feminine fragrance. A powdery floral bouquet housed in the most iconic bottle in perfumery.', 2100.00, 'https://amazon.co.za/dp/example5', 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop', 4, 4, 3, ARRAY['Aldehyde', 'Rose', 'Jasmine', 'Sandalwood'], 'Floral', ARRAY['Spring', 'Summer'], ARRAY['Special Events', 'Formal', 'Date Night']),

('Bleu de Chanel', 'Chanel', 'An unexpected, undefinable and liberating composition. Fresh and elegant with dry cedar at the base.', 1850.00, 'https://amazon.co.za/dp/example6', 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=400&fit=crop', 4, 4, 4, ARRAY['Citrus', 'Cedar', 'Sandalwood', 'Ginger'], 'Fresh', ARRAY['Spring', 'Summer', 'Fall'], ARRAY['Daily', 'Office', 'Casual']);