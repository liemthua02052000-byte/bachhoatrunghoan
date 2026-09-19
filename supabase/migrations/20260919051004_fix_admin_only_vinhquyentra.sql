/*
 * Pin admin to vinhquyentra@gmail.com only.
 * - Update the trigger to check email instead of "first user".
 * - Strip admin from any other account that currently has it.
 * - All other users remain is_admin=false, is_approved=true (can use the app, not admin panel).
 */

-- 1. Remove admin from anyone who isn't vinhquyentra@gmail.com
UPDATE admin_profiles
SET is_admin = false
WHERE email != 'vinhquyentra@gmail.com' AND is_admin = true;

-- 2. Ensure vinhquyentra@gmail.com is admin + approved
UPDATE admin_profiles
SET is_admin = true, is_approved = true
WHERE email = 'vinhquyentra@gmail.com';

-- 3. Replace trigger: only vinhquyentra@gmail.com becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'vinhquyentra@gmail.com' THEN
    INSERT INTO admin_profiles (id, email, is_admin, is_approved)
    VALUES (NEW.id, NEW.email, true, true)
    ON CONFLICT (id) DO UPDATE SET is_admin = true, is_approved = true;
  ELSE
    INSERT INTO admin_profiles (id, email, is_admin, is_approved)
    VALUES (NEW.id, NEW.email, false, true)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
