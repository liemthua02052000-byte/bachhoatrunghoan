/*
# Auto-approve all users + track user-owned scan history

1. Changes to admin_profiles
- Set is_approved=true for ALL existing users (auto-approve).
- Update the handle_new_admin_user trigger to auto-approve all new signups.
  First user is still admin; all subsequent users are is_admin=false but is_approved=true.
- Admins can still see all user profiles in the admin panel.

2. Changes to scan_reports
- Add `user_id` column (uuid, nullable) — links a scan to the user who created it.
- Add index on user_id for admin queries.
- Update RLS: keep anon+authenticated open access (existing behavior) but
  the user_id column lets the admin panel group scans by user.

3. New helper function
- `get_all_users_with_scan_counts` — SECURITY DEFINER, admin-only.
  Returns every user's id, email, is_admin, is_approved, created_at, and
  total scan count — for the admin panel.

4. Security
- RLS on scan_reports stays open (anon+authenticated) so the public scan tool keeps working.
- The new helper is admin-only (checks is_approved_admin via admin_profiles.is_admin).
*/

-- 1. Auto-approve all existing users
UPDATE admin_profiles SET is_approved = true WHERE is_approved = false;

-- 2. Update the signup trigger: auto-approve everyone
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
    INSERT INTO admin_profiles (id, email, is_admin, is_approved)
    VALUES (NEW.id, NEW.email, true, true);
  ELSE
    INSERT INTO admin_profiles (id, email, is_admin, is_approved)
    VALUES (NEW.id, NEW.email, false, true);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Add user_id to scan_reports (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scan_reports' AND column_name = 'user_id') THEN
    ALTER TABLE scan_reports ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scan_reports_user_id ON scan_reports(user_id);

-- 4. Helper: get all users with their scan counts (admin only)
CREATE OR REPLACE FUNCTION public.get_all_users_with_scan_counts()
RETURNS TABLE (
  id uuid,
  email text,
  is_admin boolean,
  is_approved boolean,
  created_at timestamptz,
  scan_count bigint
)
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

  RETURN QUERY
  SELECT
    ap.id,
    ap.email,
    ap.is_admin,
    ap.is_approved,
    ap.created_at,
    COALESCE(s.cnt, 0) AS scan_count
  FROM admin_profiles ap
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS cnt
    FROM scan_reports
    WHERE user_id IS NOT NULL
    GROUP BY user_id
  ) s ON s.user_id = ap.id
  ORDER BY ap.created_at DESC;
END;
$$ LANGUAGE plpgsql;
