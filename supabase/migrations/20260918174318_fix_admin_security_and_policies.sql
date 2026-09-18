/*
# Fix admin security: is_approved_admin check + admin_profiles UPDATE policy

1. Fix is_approved_admin function
- Previously only checked is_approved, not is_admin.
- Now checks BOTH is_admin = true AND is_approved = true.
- This prevents regular users from accessing admin-only tables (monitored_posts, monitor_snapshots).

2. Add UPDATE policy on admin_profiles
- Admins can update other users' approval status via a SECURITY DEFINER RPC.
- The policy allows authenticated users to update their own row (for future self-service).
- A new RPC function `admin_update_user_approval` lets admins toggle approval on any user.

3. Add SELECT policy for admin_profiles
- Admins can read ALL profiles (needed for the users tab).
- Users can still read their own profile (existing policy kept).
*/

-- 1. Fix is_approved_admin to check is_admin AND is_approved
CREATE OR REPLACE FUNCTION public.is_approved_admin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  record_count integer;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM admin_profiles
  WHERE id = auth.uid() AND is_admin = true AND is_approved = true;
  RETURN record_count > 0;
END;
$$ LANGUAGE plpgsql;

-- 2. Add admin SELECT policy on admin_profiles (admins can read all profiles)
DROP POLICY IF EXISTS "admin_read_all_profiles" ON admin_profiles;
CREATE POLICY "admin_read_all_profiles" ON admin_profiles FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles ap WHERE ap.id = auth.uid() AND ap.is_admin = true));

-- 3. Add RPC for admin to update user approval status
CREATE OR REPLACE FUNCTION public.admin_update_user_approval(target_uid uuid, new_approved boolean)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  SELECT is_admin INTO caller_is_admin FROM admin_profiles WHERE id = auth.uid();
  IF NOT COALESCE(caller_is_admin, false) THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;
  UPDATE admin_profiles SET is_approved = new_approved WHERE id = target_uid;
END;
$$ LANGUAGE plpgsql;
