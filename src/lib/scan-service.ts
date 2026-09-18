import { supabase } from './supabase';
import type { ScanInput, ScanResult, ScanReport, InteractionEntry, InteractionType } from './types';
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

export async function getScanWithInteractions(scanId: string) {
  const [reportRes, interactionsRes] = await Promise.all([
    supabase.from('scan_reports').select('*').eq('id', scanId).single(),
    supabase
      .from('interactions_log')
      .select('*')
      .eq('scan_id', scanId)
      .order('detected_at', { ascending: true }),
  ]);

  if (reportRes.error || !reportRes.data) return null;

  const report = reportRes.data as ScanReport;
  const rawInteractions = (interactionsRes.data ?? []) as Array<{
    interaction_type: string;
    profile_name: string | null;
    profile_url: string | null;
    is_empty_profile: boolean;
    is_new_account: boolean;
    has_profile_photo: boolean;
    content: string | null;
  }>;

  const interactions: InteractionEntry[] = rawInteractions.map((r) => ({
    interactionType: r.interaction_type as InteractionType,
    profileName: r.profile_name ?? '',
    profileUrl: r.profile_url ?? undefined,
    isEmptyProfile: r.is_empty_profile,
    isNewAccount: r.is_new_account,
    hasProfilePhoto: r.has_profile_photo,
    content: r.content ?? undefined,
  }));

  const input: ScanInput = {
    postUrl: report.post_url,
    postContent: report.post_content ?? undefined,
    postDate: report.post_date ?? undefined,
    totalReactions: report.total_reactions,
    totalComments: report.total_comments,
    totalShares: report.total_shares,
    reactionBreakdown: report.reaction_breakdown ?? {},
    interactions,
  };

  const analysisResult = analyzePost(input);

  return { report, result: analysisResult, input };
}

export async function deleteScanReport(id: string): Promise<boolean> {
  const { error } = await supabase.from('scan_reports').delete().eq('id', id);
  return !error;
}

export { analyzePost };
