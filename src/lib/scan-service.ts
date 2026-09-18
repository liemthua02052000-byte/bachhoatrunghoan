import { supabase } from './supabase';
import type { ScanInput, ScanResult } from './types';
import { analyzePost } from './analyzer';

export async function saveScanReport(
  input: ScanInput,
  result: ScanResult
): Promise<string | null> {
  const { data, error } = await supabase
    .from('scan_reports')
    .insert({
      post_url: input.postUrl,
      post_content: input.postContent ?? null,
      post_date: input.postDate ?? null,
      total_reactions: input.totalReactions,
      total_comments: input.totalComments,
      total_shares: input.totalShares,
      reaction_breakdown: input.reactionBreakdown,
      risk_score: result.riskScore,
      risk_level: result.riskLevel,
      detected_signals: result.detectedSignals,
      engagement_ratio: result.engagementRatio,
    })
    .select('id')
    .single();

  if (error || !data) return null;

  const scanId = data.id;

  if (input.interactions.length > 0) {
    const rows = input.interactions.map((i) => ({
      scan_id: scanId,
      interaction_type: i.interactionType,
      profile_name: i.profileName,
      profile_url: i.profileUrl ?? null,
      is_empty_profile: i.isEmptyProfile,
      is_new_account: i.isNewAccount,
      has_profile_photo: i.hasProfilePhoto,
      content: i.content ?? null,
    }));
    await supabase.from('interactions_log').insert(rows);
  }

  return scanId;
}

export async function getScanHistory(limit = 20) {
  const { data, error } = await supabase
    .from('scan_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return data;
}

export async function deleteScanReport(id: string): Promise<boolean> {
  const { error } = await supabase.from('scan_reports').delete().eq('id', id);
  return !error;
}

export { analyzePost };
