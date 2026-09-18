import type {
  ScanInput,
  ScanResult,
  DetectedSignal,
  RiskLevel,
  InteractionEntry,
  FlaggedAccount,
  FlagReason,
} from './types';

function classifyRisk(score: number): RiskLevel {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

const genericComments = [
  'like', 'love', 'good', 'nice', 'great', 'ok', 'hay', 'dep',
  'tot', 'hay lam', 'like like', 'share', 'follow', 'cam on',
  '+1', 'haha', 'wow', 'nice post', 'good post', 'great post',
  'sum', 'share share', 'like share', 'dep qua', 'hay qua',
  'cam on admin', 'thanks', 'thank you', 'ok ban', 'good share',
];

// Common bot-name patterns: lots of random digits, "User" + numbers, Vietnamese keyboard spam
const botNamePatterns = [
  /^user\d+/i,
  /^user\s*\d+/i,
  /^[a-z]+\d{4,}$/i,
  /^(nguoi|tai)\s*khoan/i,
  /^\d{5,}/,
  /^(guest|visitor|unknown)/i,
];

const spamPatterns = [
  /\b(?:vay|vonn|vayvon|mcc|chuyenkhoan|nhactien|kiemtien|casino|daigia)\b/i,
  /\b(?:bit\.ly|tinyurl|t\.co|shortlink)\b/i,
  /(.)\1{4,}/, // same char repeated 5+ times
  /^[A-Z\s]{10,}$/, // all caps long string
];

function flagInteractions(interactions: InteractionEntry[]): {
  flagged: FlaggedAccount[];
  signals: DetectedSignal[];
} {
  const signals: DetectedSignal[] = [];
  const total = interactions.length;
  if (total === 0) return { flagged: [], signals };

  const flagged: FlaggedAccount[] = [];
  const namesSeen = new Map<string, number[]>();

  interactions.forEach((it, idx) => {
    const reasons: { type: FlagReason; label: string }[] = [];

    // Empty profile
    if (it.isEmptyProfile) {
      reasons.push({
        type: 'empty_profile',
        label: 'Trang cá nhân trống — không có bài đăng, bạn bè, hoặc thông tin cá nhân',
      });
    }

    // New account
    if (it.isNewAccount) {
      reasons.push({
        type: 'new_account',
        label: 'Tài khoản mới tạo — nick ảo thường được tạo gần ngày buff',
      });
    }

    // No profile photo
    if (!it.hasProfilePhoto) {
      reasons.push({
        type: 'no_photo',
        label: 'Không có ảnh đại diện — dấu hiệu nick ảo/clone',
      });
    }

    // Generic / spam comment
    if (it.content && it.content.trim().length > 0) {
      const trimmed = it.content.trim().toLowerCase();
      if (genericComments.includes(trimmed) || trimmed.length < 3) {
        reasons.push({
          type: 'generic_comment',
          label: `Comment ngắn/generic ("${it.content.trim()}") — dấu hiệu comment tự động`,
        });
      }

      for (const pattern of spamPatterns) {
        if (pattern.test(it.content)) {
          reasons.push({
            type: 'spam_pattern',
            label: `Comment có pattern spam/quảng cáo — nội dung: "${it.content.trim().slice(0, 60)}"`,
          });
          break;
        }
      }
    }

    // Bot-like name
    for (const pattern of botNamePatterns) {
      if (pattern.test(it.profileName)) {
        reasons.push({
          type: 'bot_name',
          label: `Tên tài khoản có pattern tự động ("${it.profileName}") — không giống tên thật`,
        });
        break;
      }
    }

    // Track name duplicates
    const nameKey = it.profileName.trim().toLowerCase();
    if (nameKey) {
      const indices = namesSeen.get(nameKey) ?? [];
      indices.push(idx);
      namesSeen.set(nameKey, indices);
    }

    // Determine confidence
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (reasons.length >= 3) confidence = 'high';
    else if (reasons.length >= 2) confidence = 'medium';

    if (reasons.length > 0) {
      flagged.push({
        index: idx,
        profileName: it.profileName || '(không rõ tên)',
        profileUrl: it.profileUrl,
        interactionType: it.interactionType,
        reasons,
        content: it.content,
        confidence,
      });
    }
  });

  // Mark duplicates as a reason (second+ occurrence)
  for (const [name, indices] of namesSeen) {
    if (indices.length > 1) {
      for (let i = 1; i < indices.length; i++) {
        const existing = flagged.find((f) => f.index === indices[i]);
        if (existing) {
          existing.reasons.push({
            type: 'duplicate_name',
            label: `Tên "${it_profileName(interactions[indices[i]])}" xuất hiện ${indices.length} lần — tool spam dùng cùng tên`,
          });
          if (existing.confidence === 'low') existing.confidence = 'medium';
        } else {
          flagged.push({
            index: indices[i],
            profileName: interactions[indices[i]].profileName || '(không rõ tên)',
            profileUrl: interactions[indices[i]].profileUrl,
            interactionType: interactions[indices[i]].interactionType,
            reasons: [{
              type: 'duplicate_name',
              label: `Tên "${interactions[indices[i]].profileName}" xuất hiện ${indices.length} lần — tool spam dùng cùng tên`,
            }],
            content: interactions[indices[i]].content,
            confidence: 'medium',
          });
        }
      }
    }
  }

  // Sort: highest confidence first
  const confidenceOrder = { high: 0, medium: 1, low: 2 };
  flagged.sort((a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence]);

  // Generate aggregate signals
  let emptyProfileCount = 0;
  let newAccountCount = 0;
  let noPhotoCount = 0;
  let genericCommentCount = 0;
  let spamCount = 0;
  let botNameCount = 0;
  let duplicateNames = 0;

  for (const f of flagged) {
    for (const r of f.reasons) {
      if (r.type === 'empty_profile') emptyProfileCount++;
      if (r.type === 'new_account') newAccountCount++;
      if (r.type === 'no_photo') noPhotoCount++;
      if (r.type === 'generic_comment') genericCommentCount++;
      if (r.type === 'spam_pattern') spamCount++;
      if (r.type === 'bot_name') botNameCount++;
      if (r.type === 'duplicate_name') duplicateNames++;
    }
  }

  const emptyPct = (emptyProfileCount / total) * 100;
  const newPct = (newAccountCount / total) * 100;
  const noPhotoPct = (noPhotoCount / total) * 100;
  const genericPct = (genericCommentCount / total) * 100;

  if (emptyPct >= 30) {
    signals.push({
      type: 'empty_profiles',
      description: `${emptyProfileCount}/${total} (${emptyPct.toFixed(0)}%) tài khoản có trang cá nhân trống — dấu hiệu nick ảo.`,
      severity: emptyPct >= 60 ? 'danger' : 'warning',
    });
  }

  if (newPct >= 20) {
    signals.push({
      type: 'new_accounts',
      description: `${newAccountCount}/${total} (${newPct.toFixed(0)}%) tài khoản mới tạo — thường đi kèm buff.`,
      severity: newPct >= 50 ? 'danger' : 'warning',
    });
  }

  if (noPhotoPct >= 20) {
    signals.push({
      type: 'no_profile_photo',
      description: `${noPhotoCount}/${total} (${noPhotoPct.toFixed(0)}%) tài khoản không có ảnh đại diện — nick ảo.`,
      severity: noPhotoPct >= 50 ? 'danger' : 'warning',
    });
  }

  if (genericPct >= 40) {
    signals.push({
      type: 'generic_comments',
      description: `${genericCommentCount} bình luận ngắn/generic — dấu hiệu comment tự động.`,
      severity: genericPct >= 70 ? 'danger' : 'warning',
    });
  }

  if (spamCount > 0) {
    signals.push({
      type: 'spam_content',
      description: `${spamCount} comment chứa nội dung spam/quảng cáo/link rút gọn.`,
      severity: spamCount >= 5 ? 'danger' : 'warning',
    });
  }

  if (botNameCount > 0) {
    signals.push({
      type: 'bot_names',
      description: `${botNameCount} tài khoản có tên theo pattern tự động (vd: User12345, số dài...) — dấu hiệu tạo hàng loạt.`,
      severity: botNameCount >= 3 ? 'danger' : 'warning',
    });
  }

  if (duplicateNames > 0) {
    signals.push({
      type: 'duplicate_names',
      description: `${duplicateNames} tên tài khoản lặp lại — có thể tool spam.`,
      severity: duplicateNames >= 5 ? 'danger' : 'warning',
    });
  }

  return { flagged, signals };
}

// Helper to safely get profile name
function it_profileName(entry: InteractionEntry): string {
  return entry.profileName || '(không rõ)';
}

function analyzeEngagementRatios(input: ScanInput): {
  ratio: number;
  signals: DetectedSignal[];
} {
  const signals: DetectedSignal[] = [];
  const { totalReactions, totalComments, totalShares } = input;

  const ratio = totalComments > 0 ? totalReactions / totalComments : 0;

  if (ratio > 100 && totalReactions > 500) {
    signals.push({
      type: 'extreme_reaction_comment_ratio',
      description: `Tỷ lệ react/comment = ${ratio.toFixed(1)} — bình thường 10-30, giá trị cao bất thường, nghi buff react.`,
      severity: 'danger',
    });
  } else if (ratio > 50 && totalReactions > 200) {
    signals.push({
      type: 'high_reaction_comment_ratio',
      description: `Tỷ lệ react/comment = ${ratio.toFixed(1)} — cao hơn mức thông thường, cần kiểm tra thêm.`,
      severity: 'warning',
    });
  }

  if (totalReactions > 1000 && totalComments < 10) {
    signals.push({
      type: 'low_comment_high_reaction',
      description: `${totalReactions} react nhưng chỉ ${totalComments} comment — viral thật thường có nhiều comment hơn.`,
      severity: 'danger',
    });
  }

  const shareRatio = totalReactions > 0 ? totalShares / totalReactions : 0;
  if (shareRatio > 0.5 && totalShares > 100) {
    signals.push({
      type: 'high_share_ratio',
      description: `Tỷ lệ share/react = ${(shareRatio * 100).toFixed(0)}% — cao bất thường, nghi buff share.`,
      severity: 'warning',
    });
  }

  if (totalReactions > 500 && totalShares < 2) {
    signals.push({
      type: 'zero_shares',
      description: `${totalReactions} react nhưng gần như không có share — viral thật thường được chia sẻ.`,
      severity: 'warning',
    });
  }

  return { ratio, signals };
}

function analyzeReactionBreakdown(input: ScanInput): DetectedSignal[] {
  const signals: DetectedSignal[] = [];
  const bd = input.reactionBreakdown;
  const total = Object.values(bd).reduce((a, b) => a + (b ?? 0), 0);

  if (total === 0) return signals;

  const likePct = ((bd.like ?? 0) / total) * 100;

  if (likePct >= 95 && total > 200) {
    signals.push({
      type: 'like_dominant',
      description: `${likePct.toFixed(0)}% phản ứng là "Like" — bài thật có đa dạng Love, Haha, Wow. Tool buff thường chỉ dùng Like.`,
      severity: 'warning',
    });
  }

  const reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry'] as const;
  const nonZero = reactionTypes.filter((t) => (bd[t] ?? 0) > 0);
  if (nonZero.length >= 4) {
    const values = nonZero.map((t) => bd[t] ?? 0);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
    const cv = avg > 0 ? Math.sqrt(variance) / avg : 0;
    if (cv < 0.1 && total > 300) {
      signals.push({
        type: 'uniform_reactions',
        description: 'Phân bổ các loại react quá đều nhau — bài thật thường có phân bổ không đối xứng.',
        severity: 'warning',
      });
    }
  }

  return signals;
}

function analyzePostTiming(input: ScanInput): DetectedSignal[] {
  const signals: DetectedSignal[] = [];
  if (!input.postDate) return signals;

  const postDate = new Date(input.postDate);
  const now = new Date();
  const ageHours = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);

  const totalEng = input.totalReactions + input.totalComments + input.totalShares;
  if (ageHours < 1 && totalEng > 500) {
    signals.push({
      type: 'burst_engagement',
      description: `${totalEng} tương tác trong chưa đầy 1 giờ — tăng trưởng tự nhiên hiếm khi đạt mức này.`,
      severity: 'danger',
    });
  } else if (ageHours < 6 && totalEng > 2000) {
    signals.push({
      type: 'rapid_engagement',
      description: `${totalEng} tương tác trong ${ageHours.toFixed(0)} giờ — tốc độ cao bất thường.`,
      severity: 'warning',
    });
  }

  return signals;
}

export function analyzePost(input: ScanInput): ScanResult {
  const allSignals: DetectedSignal[] = [];

  const interactionResult = flagInteractions(input.interactions);
  allSignals.push(...interactionResult.signals);

  const engagementResult = analyzeEngagementRatios(input);
  allSignals.push(...engagementResult.signals);

  allSignals.push(...analyzeReactionBreakdown(input));
  allSignals.push(...analyzePostTiming(input));

  let score = 0;
  for (const s of allSignals) {
    if (s.severity === 'danger') score += 20;
    else if (s.severity === 'warning') score += 10;
    else score += 3;
  }

  const flaggedCount = interactionResult.flagged.length;
  if (input.interactions.length > 0) {
    const flaggedPct = (flaggedCount / input.interactions.length) * 100;
    score += Math.min(flaggedPct * 0.4, 30);
  }

  if (engagementResult.ratio > 100) score += 10;

  score = Math.min(Math.round(score), 100);

  return {
    riskScore: score,
    riskLevel: classifyRisk(score),
    detectedSignals: allSignals,
    engagementRatio: Math.round(engagementResult.ratio * 10) / 10,
    suspiciousInteractionCount: flaggedCount,
    totalInteractionCount: input.interactions.length,
    flaggedAccounts: interactionResult.flagged,
  };
}
