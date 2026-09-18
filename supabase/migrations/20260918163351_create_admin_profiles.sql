/*
# Create admin profiles table with first-user-is-admin logic

1. New Tables
- `admin_profiles` — links to auth.users, tracks admin role and approval status
  - id (uuid PK, matches auth.users.id)
  - email (text) — denormalized for display
  - is_admin (boolean, default false) — true for the first registered user
  - is_approved (boolean, default false) — must be true to log in
  - created_at (timestamptz)

2. Security
- Enable RLS on admin_profiles.
- Authenticated users can read their own profile.
- A SECURITY DEFINER function handles the first-user-is-admin logic on signup.
- A trigger calls the function after each new auth.users insert.

3. Logic
- The first user to register automatically becomes admin (is_admin=true, is_approved=true).
- All subsequent users start as is_admin=false, is_approved=false — they cannot access the panel until approved.
*/

CREATE TABLE IF NOT EXISTS admin_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_admin_profile" ON admin_profiles;
CREATE POLICY "read_own_admin_profile" ON admin_profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

-- SECURITY DEFINER function: called on signup. First user becomes admin.
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM admin_profiles WHERE is_admin = true;

  IF admin_count = 0 THEN
    -- First user: auto-admin, auto-approved
    INSERT INTO admin_profiles (id, email, is_admin, is_approved)
    VALUES (NEW.id, NEW.email, true, true);
  ELSE
    -- Subsequent users: not admin, not approved
    INSERT INTO admin_profiles (id, email, is_admin, is_approved)
    VALUES (NEW.id, NEW.email, false, false);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin_user();

-- Allow authenticated users to read their own admin profile via a helper function
CREATE OR REPLACE FUNCTION public.get_my_admin_profile()
RETURNS TABLE (id uuid, email text, is_admin boolean, is_approved boolean, created_at timestamptz)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT ap.id, ap.email, ap.is_admin, ap.is_approved, ap.created_at
  FROM admin_profiles ap
  WHERE ap.id = auth.uid();
END;
$$ LANGUAGE plpgsql;
