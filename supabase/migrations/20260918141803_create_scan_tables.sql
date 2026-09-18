/*
# Create Facebook post scan tables (single-tenant, no auth)

1. New Tables
- `page_profiles` — stores Facebook page info being monitored
  - id (uuid PK)
  - page_name (text) — display name of the page
  - page_url (text) — URL to the Facebook page
  - follower_count (integer) — number of followers
  - created_at (timestamptz)

- `scan_reports` — each scan run for a page or post
  - id (uuid PK)
  - page_id (uuid FK → page_profiles, nullable)
  - post_url (text) — URL of the post being analyzed
  - post_content (text) — snippet of post content
  - post_date (timestamptz, nullable) — when the post was published
  - total_reactions (integer) — total reaction count
  - total_comments (integer) — total comment count
  - total_shares (integer) — total share count
  - reaction_breakdown (jsonb) — {like, love, haha, wow, sad, angry}
  - risk_score (integer) — 0-100, higher = more likely buffed
  - risk_level (text) — 'low', 'medium', 'high', 'critical'
  - detected_signals (jsonb) — array of signal objects {type, description, severity}
  - engagement_ratio (numeric) — reactions/comments ratio
  - created_at (timestamptz)

- `interactions_log` — individual interaction data points for analysis
  - id (uuid PK)
  - scan_id (uuid FK → scan_reports)
  - interaction_type (text) — 'react', 'comment', 'share'
  - profile_name (text) — name of interacting user
  - profile_url (text, nullable)
  - is_empty_profile (boolean) — profile appears to have no content
  - is_new_account (boolean) — account created recently
  - has_profile_photo (boolean)
  - content (text, nullable) — comment text
  - detected_at (timestamptz)

2. Security
- Enable RLS on all tables.
- Single-tenant: allow anon + authenticated full CRUD (data is intentionally shared).
*/

CREATE TABLE IF NOT EXISTS page_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_name text NOT NULL,
  page_url text NOT NULL,
  follower_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE page_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_pages" ON page_profiles;
CREATE POLICY "anon_select_pages" ON page_profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_pages" ON page_profiles;
CREATE POLICY "anon_insert_pages" ON page_profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_pages" ON page_profiles;
CREATE POLICY "anon_update_pages" ON page_profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_pages" ON page_profiles;
CREATE POLICY "anon_delete_pages" ON page_profiles FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS scan_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES page_profiles(id) ON DELETE CASCADE,
  post_url text NOT NULL,
  post_content text,
  post_date timestamptz,
  total_reactions integer DEFAULT 0,
  total_comments integer DEFAULT 0,
  total_shares integer DEFAULT 0,
  reaction_breakdown jsonb DEFAULT '{}',
  risk_score integer DEFAULT 0,
  risk_level text DEFAULT 'low',
  detected_signals jsonb DEFAULT '[]',
  engagement_ratio numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scan_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scans" ON scan_reports;
CREATE POLICY "anon_select_scans" ON scan_reports FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scans" ON scan_reports;
CREATE POLICY "anon_insert_scans" ON scan_reports FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_scans" ON scan_reports;
CREATE POLICY "anon_update_scans" ON scan_reports FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_scans" ON scan_reports;
CREATE POLICY "anon_delete_scans" ON scan_reports FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS interactions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES scan_reports(id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  profile_name text,
  profile_url text,
  is_empty_profile boolean DEFAULT false,
  is_new_account boolean DEFAULT false,
  has_profile_photo boolean DEFAULT true,
  content text,
  detected_at timestamptz DEFAULT now()
);

ALTER TABLE interactions_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_interactions" ON interactions_log;
CREATE POLICY "anon_select_interactions" ON interactions_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_interactions" ON interactions_log;
CREATE POLICY "anon_insert_interactions" ON interactions_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_interactions" ON interactions_log;
CREATE POLICY "anon_update_interactions" ON interactions_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_interactions" ON interactions_log;
CREATE POLICY "anon_delete_interactions" ON interactions_log FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_scan_reports_page_id ON scan_reports(page_id);
CREATE INDEX IF NOT EXISTS idx_scan_reports_created_at ON scan_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_scan_id ON interactions_log(scan_id);
