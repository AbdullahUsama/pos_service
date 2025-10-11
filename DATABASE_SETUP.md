# Database Setup SQL for Supabase

## Run these SQL commands in your Supabase SQL Editor

**IMPORTANT: If you already have the tables, run this first to add the username column:**

```sql
-- Add username column to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Update existing profiles with usernames based on email
UPDATE profiles 
SET username = split_part((
  SELECT email FROM auth.users WHERE auth.users.id = profiles.id
), '@', 1)
WHERE username IS NULL;

-- Make username column NOT NULL and UNIQUE
ALTER TABLE profiles 
ALTER COLUMN username SET NOT NULL,
ADD CONSTRAINT profiles_username_unique UNIQUE (username);
```

**For new setups, run all the SQL below:**

```sql
-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cashier_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Transfer')),
  cart_details JSONB NOT NULL
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')) DEFAULT 'cashier',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Items policies
CREATE POLICY "Everyone can view items" ON items
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert items" ON items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update items" ON items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete items" ON items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Sales policies
CREATE POLICY "Cashiers can view own sales, admins can view all" ON sales
  FOR SELECT USING (
    auth.uid() = cashier_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Cashiers can insert own sales" ON sales
  FOR INSERT WITH CHECK (auth.uid() = cashier_id);

-- Insert some sample items (optional)
INSERT INTO items (name, price) VALUES
  ('Coffee', 2.50),
  ('Tea', 2.00),
  ('Sandwich', 5.99),
  ('Chips', 1.50),
  ('Soda', 1.99),
  ('Cookie', 1.25),
  ('Energy Drink', 3.50),
  ('Water Bottle', 1.00)
ON CONFLICT DO NOTHING;

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't auto-create profile anymore, let the app handle it
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## After running the SQL, you need to:

1. **Check if you have existing users without profiles:**
   ```sql
   SELECT u.id, u.email, p.username, p.role 
   FROM auth.users u 
   LEFT JOIN profiles p ON u.id = p.id 
   WHERE p.id IS NULL;
   ```

2. **Create profiles for existing users (if any):**
   ```sql
   -- You'll need to manually create profiles for existing users
   -- Replace 'desired_username' and 'USER_ID_HERE' with actual values
   INSERT INTO profiles (id, username, role)
   VALUES ('USER_ID_HERE', 'desired_username', 'cashier');
   ```

3. **Create admin user(s) by updating their profile:**
   ```sql
   -- First, find the user ID you want to make admin
   SELECT u.id, u.email, p.username FROM auth.users u JOIN profiles p ON u.id = p.id;
   
   -- Then update their role (replace USER_ID_HERE with actual UUID)
   UPDATE profiles SET role = 'admin' WHERE id = 'USER_ID_HERE';
   ```

4. **Verify the setup:**
   ```sql
   -- Check all users and their roles
   SELECT u.email, p.username, p.role, p.created_at 
   FROM auth.users u 
   JOIN profiles p ON u.id = p.id;
   ```

5. Make sure your Supabase project has the following RLS policies enabled
6. Test the authentication flow by creating test users

## How the new system works:

- **Sign Up**: Users provide both email and username
- **Login**: Users can login with either email OR username
- **Display**: The system shows usernames in the interface
- **Authentication**: Uses real emails for Supabase auth (much more reliable)

## Environment Variables
Make sure your `.env.local` has the correct Supabase credentials:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY