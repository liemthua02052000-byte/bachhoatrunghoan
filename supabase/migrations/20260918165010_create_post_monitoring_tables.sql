/*
# Create post monitoring tables for tracking engagement changes over time

1. New Tables
- `monitored_posts` — posts that admins are tracking for engagement changes
  - id (uuid PK)
  - post_url (text, not null) — the Facebook post URL
  - post_content (text, nullable) — excerpt of the post content
  - post_date (text, nullable) — date of the original post
  - current_reactions (integer, default 0) — latest known reaction count
  - current_comments (integer, default 0) — latest known comment count
  - current_shares (integer, default 0) — latest known share count
  - status (text, default 'active') — 'active' or 'paused'
  - created_by (uuid, references auth.users) — which admin created this
  - created_at (timestamptz)
  - last_checked_at (timestamptz) — when the last snapshot was taken

- `monitor_snapshots` — point-in-time readings of a monitored post's metrics
  - id (uuid PK)
  - monitored_post_id (uuid FK -> monitored_posts, cascade delete)
  - snapshot_reactions (integer, not null)
  - snapshot_comments (integer, not null)
  - snapshot_shares (integer, not null)
  - delta_reactions (integer, default 0) — change since previous snapshot
  - delta_comments (integer, default 0)
  - delta_shares (integer, default 0)
  - risk_score (integer, default 0) — computed risk at time of snapshot
  - risk_level (text, default 'low')
  - engagement_ratio (float, default 0)
  - notes (text, nullable)
  - created_at (timestamptz)

2. Helper Function
- `is_approved_admin()` — returns true if current auth user is an approved admin
  Used by all RLS policies on both tables.

3. Security
- RLS enabled on both tables.
- All CRUD scoped to approved admins only via is_approved_admin().
- Only admins who pass the approval check can read, insert, update, or delete.
*/

-- Helper function: check if current user is an approved admin
CREATE OR REPLACE FUNCTION public.is_approved_admin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  approved boolean;
BEGIN
  SELECT is_approved INTO approved
  FROM admin_profiles
  WHERE id = auth.uid();
  RETURN COALESCE(approved, false);
END;
$$ LANGUAGE plpgsql;

-- monitored_posts table
CREATE TABLE IF NOT EXISTS monitored_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_url text NOT NULL,
  post_content text,
  post_date text,
  current_reactions integer NOT NULL DEFAULT 0,
  current_comments integer NOT NULL DEFAULT 0,
  current_shares integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  last_checked_at timestamptz DEFAULT now()
);

ALTER TABLE monitored_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_monitored_posts" ON monitored_posts;
CREATE POLICY "admin_select_monitored_posts" ON monitored_posts FOR SELECT
  TO authenticated USING (public.is_approved_admin());

DROP POLICY IF EXISTS "admin_insert_monitored_posts" ON monitored_posts;
CREATE POLICY "admin_insert_monitored_posts" ON monitored_posts FOR INSERT
  TO authenticated WITH CHECK (public.is_approved_admin());

DROP POLICY IF EXISTS "admin_update_monitored_posts" ON monitored_posts;
CREATE POLICY "admin_update_monitored_posts" ON monitored_posts FOR UPDATE
  TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());

DROP POLICY IF EXISTS "admin_delete_monitored_posts" ON monitored_posts;
CREATE POLICY "admin_delete_monitored_posts" ON monitored_posts FOR DELETE
  TO authenticated USING (public.is_approved_admin());

-- monitor_snapshots table
CREATE TABLE IF NOT EXISTS monitor_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitored_post_id uuid NOT NULL REFERENCES monitored_posts(id) ON DELETE CASCADE,
  snapshot_reactions integer NOT NULL,
  snapshot_comments integer NOT NULL,
  snapshot_shares integer NOT NULL,
  delta_reactions integer NOT NULL DEFAULT 0,
  delta_comments integer NOT NULL DEFAULT 0,
  delta_shares integer NOT NULL DEFAULT 0,
  risk_score integer NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'low',
  engagement_ratio float NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE monitor_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_snapshots" ON monitor_snapshots;
CREATE POLICY "admin_select_snapshots" ON monitor_snapshots FOR SELECT
  TO authenticated USING (public.is_approved_admin());

DROP POLICY IF EXISTS "admin_insert_snapshots" ON monitor_snapshots;
CREATE POLICY "admin_insert_snapshots" ON monitor_snapshots FOR INSERT
  TO authenticated WITH CHECK (public.is_approved_admin());

DROP POLICY IF EXISTS "admin_update_snapshots" ON monitor_snapshots;
CREATE POLICY "admin_update_snapshots" ON monitor_snapshots FOR UPDATE
  TO authenticated USING (public.is_approved_admin()) WITH CHECK (public.is_approved_admin());

DROP POLICY IF EXISTS "admin_delete_snapshots" ON monitor_snapshots;
CREATE POLICY "admin_delete_snapshots" ON monitor_snapshots FOR DELETE
  TO authenticated USING (public.is_approved_admin());

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_monitor_snapshots_post_id ON monitor_snapshots(monitored_post_id);
CREATE INDEX IF NOT EXISTS idx_monitor_snapshots_created_at ON monitor_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitored_posts_status ON monitored_posts(status);
