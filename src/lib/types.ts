export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type InteractionType = 'react' | 'comment' | 'share';

export interface ReactionBreakdown {
  like?: number;
  love?: number;
  haha?: number;
  wow?: number;
  sad?: number;
  angry?: number;
}

export interface DetectedSignal {
  type: string;
  description: string;
  severity: 'info' | 'warning' | 'danger';
}

export type FlagReason =
  | 'empty_profile'
  | 'new_account'
  | 'no_photo'
  | 'generic_comment'
  | 'duplicate_name'
  | 'spam_pattern'
  | 'bot_name'
  | 'repeated_content'
  | 'link_spam'
  | 'scripted_pattern'
  | 'numbered_name'
  | 'no_lastname'
  | 'foreign_name'
  | 'emoji_name'
  | 'keyword_name';

export type ThreatCategory = 'buff' | 'tool' | 'hack' | 'clean';

export interface FlaggedAccount {
  index: number;
  profileName: string;
  profileUrl?: string;
  interactionType: InteractionType;
  reasons: { type: FlagReason; label: string }[];
  content?: string;
  confidence: 'high' | 'medium' | 'low';
  threatCategory: ThreatCategory;
}

export interface InteractionEntry {
  interactionType: InteractionType;
  profileName: string;
  profileUrl?: string;
  isEmptyProfile: boolean;
  isNewAccount: boolean;
  hasProfilePhoto: boolean;
  content?: string;
}

export interface ScanInput {
  postUrl: string;
  postContent?: string;
  postDate?: string;
  totalReactions: number;
  totalComments: number;
  totalShares: number;
  reactionBreakdown: ReactionBreakdown;
  interactions: InteractionEntry[];
}

export interface ScanResult {
  riskScore: number;
  riskLevel: RiskLevel;
  detectedSignals: DetectedSignal[];
  engagementRatio: number;
  suspiciousInteractionCount: number;
  totalInteractionCount: number;
  flaggedAccounts: FlaggedAccount[];
  allAccounts: FlaggedAccount[];
  fakeEstimate: FakeEstimate;
}

export interface FakeEstimate {
  totalFake: number;
  buff: number;
  tool: number;
  hack: number;
  real: number;
  total: number;
  confidence: 'high' | 'medium' | 'low';
  method: string;
}

export interface ScanReport {
  id: string;
  post_url: string;
  post_content: string | null;
  post_date: string | null;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  reaction_breakdown: ReactionBreakdown;
  risk_score: number;
  risk_level: RiskLevel;
  detected_signals: DetectedSignal[];
  engagement_ratio: number;
  created_at: string;
}
