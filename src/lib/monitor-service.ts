import { supabase } from './supabase';
import { analyzePost } from './analyzer';
import type { ScanInput, ScanResult } from './types';

export interface MonitoredPost {
  id: string;
  post_url: string;
  post_content: string | null;
  post_date: string | null;
  current_reactions: number;
  current_comments: number;
  current_shares: number;
  status: string;
  created_by: string | null;
  created_at: string;
  last_checked_at: string;
}

export interface MonitorSnapshot {
  id: string;
  monitored_post_id: string;
  snapshot_reactions: number;
  snapshot_comments: number;
  snapshot_shares: number;
  delta_reactions: number;
  delta_comments: number;
  delta_shares: number;
  risk_score: number;
  risk_level: string;
  engagement_ratio: number;
  notes: string | null;
  created_at: string;
}

export interface NewMonitorInput {
  postUrl: string;
  postContent?: string;
  postDate?: string;
  totalReactions: number;
  totalComments: number;
  totalShares: number;
}

export async function addMonitoredPost(input: NewMonitorInput): Promise<MonitoredPost | null> {
  const { data, error } = await supabase
    .from('monitored_posts')
    .insert({
      post_url: input.postUrl,
      post_content: input.postContent ?? null,
      post_date: input.postDate ?? null,
      current_reactions: input.totalReactions,
      current_comments: input.totalComments,
      current_shares: input.totalShares,
      status: 'active',
    })
    .select('*')
    .single();

  if (error || !data) return null;

  // Create initial snapshot
  await takeSnapshot(data.id, data, {
    totalReactions: input.totalReactions,
    totalComments: input.totalComments,
    totalShares: input.totalShares,
  });

  return data as MonitoredPost;
}

export async function getMonitoredPosts(): Promise<MonitoredPost[]> {
  const { data, error } = await supabase
    .from('monitored_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as MonitoredPost[];
}

export async function deleteMonitoredPost(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('monitored_posts')
    .delete()
    .eq('id', id);
  return !error;
}

export async function toggleMonitorStatus(id: string, currentStatus: string): Promise<boolean> {
  const newStatus = currentStatus === 'active' ? 'paused' : 'active';
  const { error } = await supabase
    .from('monitored_posts')
    .update({ status: newStatus })
    .eq('id', id);
  return !error;
}

export async function getSnapshots(postId: string, limit = 50): Promise<MonitorSnapshot[]> {
  const { data, error } = await supabase
    .from('monitor_snapshots')
    .select('*')
    .eq('monitored_post_id', postId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as MonitorSnapshot[];
}

export async function takeSnapshot(
  postId: string,
  post: MonitoredPost,
  newMetrics: { totalReactions: number; totalComments: number; totalShares: number }
): Promise<MonitorSnapshot | null> {
  const deltaReactions = newMetrics.totalReactions - post.current_reactions;
  const deltaComments = newMetrics.totalComments - post.current_comments;
  const deltaShares = newMetrics.totalShares - post.current_shares;

  // Compute risk score for this snapshot
  const scanInput: ScanInput = {
    postUrl: post.post_url,
    postContent: post.post_content ?? undefined,
    postDate: post.post_date ?? undefined,
    totalReactions: newMetrics.totalReactions,
    totalComments: newMetrics.totalComments,
    totalShares: newMetrics.totalShares,
    reactionBreakdown: {},
    interactions: [],
  };
  const result: ScanResult = analyzePost(scanInput);

  const { data, error } = await supabase
    .from('monitor_snapshots')
    .insert({
      monitored_post_id: postId,
      snapshot_reactions: newMetrics.totalReactions,
      snapshot_comments: newMetrics.totalComments,
      snapshot_shares: newMetrics.totalShares,
      delta_reactions: deltaReactions,
      delta_comments: deltaComments,
      delta_shares: deltaShares,
      risk_score: result.riskScore,
      risk_level: result.riskLevel,
      engagement_ratio: result.engagementRatio,
      notes: deltaReactions === 0 && deltaComments === 0 && deltaShares === 0 ? 'Không có biến động' : null,
    })
    .select('*')
    .single();

  if (error || !data) return null;

  // Update the monitored post's current metrics
  await supabase
    .from('monitored_posts')
    .update({
      current_reactions: newMetrics.totalReactions,
      current_comments: newMetrics.totalComments,
      current_shares: newMetrics.totalShares,
      last_checked_at: new Date().toISOString(),
    })
    .eq('id', postId);

  return data as MonitorSnapshot;
}

export async function updateMonitoredPostMetrics(
  postId: string,
  post: MonitoredPost,
  newMetrics: { totalReactions: number; totalComments: number; totalShares: number }
): Promise<MonitorSnapshot | null> {
  return takeSnapshot(postId, post, newMetrics);
}
