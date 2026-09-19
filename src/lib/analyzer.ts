import type {
  ScanInput,
  ScanResult,
  DetectedSignal,
  RiskLevel,
  InteractionEntry,
  FlaggedAccount,
  FlagReason,
  ThreatCategory,
  FakeEstimate,
  VoteScore,
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

const botNamePatterns = [
  /^user\d+/i,
  /^user\s*\d+/i,
  /^[a-z]+\d{4,}$/i,
  /^(nguoi|tai)\s*khoan/i,
  /^\d{5,}/,
  /^(guest|visitor|unknown)/i,
];

// Names that look auto-generated: numbered, single word, emoji, keyword spam
const numberedNamePatterns = [
  /\d{3,}$/, // ends with 3+ digits
  /\d{5,}/, // 5+ digits anywhere
  /^\d+/, // starts with digits
  /(?:nguyen|tran|le|pham|huynh|phan|vu|vo|dang|bui|do|ho|ngo)\d+/i, // vietnamese surname + digits
];

const emojiNamePattern = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/u;

// Names that are just one word (no last name) — common for fake accounts
function hasNoLastName(name: string): boolean {
  const words = name.trim().split(/\s+/);
  return words.length === 1 && name.trim().length <= 12 && /[a-zà-ỹ]/i.test(name);
}

// Foreign-language names (Chinese, Thai, Arabic, etc.) in a Vietnamese context
const foreignNamePatterns = [
  /[\u4e00-\u9fff]/, // Chinese characters
  /[\u0e00-\u0e7f]/, // Thai
  /[\u0600-\u06ff]/, // Arabic
  /[\u0900-\u097f]/, // Devanagari
];

// Names that contain marketing/farm keywords
const keywordNamePatterns = [
  /^(seo|marketing|farm|buff|sub|follow|like|share|vay|vonn|kiemtien|casino)/i,
  /(fpt|shop|store|sale|deal|gaia|garena|free\s?fire|pubg)/i,
];

// Vietnamese surnames for sanity checking
const vietnameseSurnames = [
  'nguyen', 'tran', 'le', 'pham', 'huynh', 'phan', 'vu', 'vo',
  'dang', 'bui', 'do', 'ho', 'ngo', 'duong', 'ly', 'lam', 'dinh',
  'vuong', 'mai', 'trinh', 'ha', 'cao', 'trieu', 'duong', 'hoang',
];

function looksLikeVietnameseName(name: string): boolean {
  const firstWord = name.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  return vietnameseSurnames.includes(firstWord);
}

// Heuristic: name with many special chars or symbols
const junkNamePattern = /[_.\-]{3,}|[~`!@#$%^&*()+=|\\<>?{}]/;

// Spam / scam / hack patterns in comments
const scamPatterns = [
  /\b(?:vay|vonn|vayvon|mcc|chuyenkhoan|nhactien|kiemtien|casino|daigia)\b/i,
  /\b(?:bit\.ly|tinyurl|t\.co|shortlink|t\.me|zalo\.me|goo\.gl)\b/i,
  /\b(?:hack|crack|keygen|patch|serial|activate|license|free\s?(?:full|pro|vip|premium))\b/i,
  /\b(?:tien\s?ao|nap\s?the|rut\s?tien|nhan\s?tien|free\s?fire|pubg|hack\s?(?:nick|acc|account|tien))\b/i,
  /\b(?:sub\s?(?:for\s?(?:sub|follow)|doi\s?(?:sub|follow))|sub\s?doi\s?sub|follow\s?doi\s?follow)\b/i,
  /(.)\1{4,}/, // same char repeated 5+ times
  /^[A-Z\s]{10,}$/, // all caps long string
];

// Scripted/bot patterns: repeated structure, copy-paste templates
const scriptedPatterns = [
  /^(.+?)\1{2,}$/, // repeated phrase 3+ times: "hay hay hay"
  /^\d+\.\s.+(\n\d+\.\s.+)*/m, // numbered list in short comment
  /\[.+\]|{.+}|<.+>/, // template bracket notation
];

const linkPatterns = [
  /https?:\/\/(?!www\.facebook\.com|fb\.com|m\.facebook\.com)/i, // non-Facebook links
  /\b(?:bit\.ly|tinyurl|t\.co|shortlink|goo\.gl|t\.me|zalo\.me|telegram)\b/i,
];

function classifyThreat(reasons: { type: FlagReason }[]): ThreatCategory {
  const reasonTypes = new Set(reasons.map((r) => r.type));

  // HACK: scam links, hack/crack keywords, scripted template patterns
  if (
    reasonTypes.has('link_spam') ||
    reasonTypes.has('scripted_pattern') ||
    reasonTypes.has('spam_pattern') ||
    reasonTypes.has('keyword_name')
  ) {
    return 'hack';
  }

  // TOOL: bot names, duplicate names, generic auto-comments, numbered names
  if (
    reasonTypes.has('bot_name') ||
    reasonTypes.has('duplicate_name') ||
    reasonTypes.has('repeated_content') ||
    reasonTypes.has('numbered_name') ||
    reasonTypes.has('emoji_name') ||
    reasonTypes.has('no_lastname') ||
    reasonTypes.has('foreign_name')
  ) {
    return 'tool';
  }

  // BUFF: empty profiles, new accounts, no photo — mass-created engagement accounts
  return 'buff';
}

function flagInteractions(interactions: InteractionEntry[]): {
  flagged: FlaggedAccount[];
  signals: DetectedSignal[];
} {
  const signals: DetectedSignal[] = [];
  const total = interactions.length;
  if (total === 0) return { flagged: [], signals };

  const flagged: FlaggedAccount[] = [];
  const namesSeen = new Map<string, number[]>();
  const contentSeen = new Map<string, number[]>();

  interactions.forEach((it, idx) => {
    const reasons: { type: FlagReason; label: string }[] = [];

    if (it.isEmptyProfile) {
      reasons.push({
        type: 'empty_profile',
        label: 'Trang cá nhân trống — không có bài đăng, bạn bè, hoặc thông tin cá nhân',
      });
    }

    if (it.isNewAccount) {
      reasons.push({
        type: 'new_account',
        label: 'Tài khoản mới tạo — nick ảo thường được tạo gần ngày buff',
      });
    }

    if (!it.hasProfilePhoto) {
      reasons.push({
        type: 'no_photo',
        label: 'Không có ảnh đại diện — dấu hiệu nick ảo/clone',
      });
    }

    if (it.content && it.content.trim().length > 0) {
      const trimmed = it.content.trim().toLowerCase();
      const displayContent = it.content.trim();

      if (genericComments.includes(trimmed) || trimmed.length < 3) {
        reasons.push({
          type: 'generic_comment',
          label: `Comment ngắn/generic ("${displayContent}") — dấu hiệu comment tự động`,
        });
      }

      for (const pattern of scamPatterns) {
        if (pattern.test(it.content)) {
          reasons.push({
            type: 'spam_pattern',
            label: `Comment có nội dung scam/hack/quảng cáo — nội dung: "${displayContent.slice(0, 60)}"`,
          });
          break;
        }
      }

      for (const pattern of linkPatterns) {
        if (pattern.test(it.content)) {
          reasons.push({
            type: 'link_spam',
            label: `Comment chứa link ngoài/spam — nội dung: "${displayContent.slice(0, 60)}"`,
          });
          break;
        }
      }

      for (const pattern of scriptedPatterns) {
        if (pattern.test(it.content)) {
          reasons.push({
            type: 'scripted_pattern',
            label: `Comment có cấu trúc template/lặp lại — dấu hiệu script tự động`,
          });
          break;
        }
      }
    }

    for (const pattern of botNamePatterns) {
      if (pattern.test(it.profileName)) {
        reasons.push({
          type: 'bot_name',
          label: `Tên tài khoản có pattern tự động ("${it.profileName}") — không giống tên thật`,
        });
        break;
      }
    }

    // Numbered name (e.g. "Nguyen12345", "tran2024")
    for (const pattern of numberedNamePatterns) {
      if (pattern.test(it.profileName)) {
        reasons.push({
          type: 'numbered_name',
          label: `Tên chứa số ("${it.profileName}") — tài khoản thật hiếm khi có số dài trong tên`,
        });
        break;
      }
    }

    // Emoji in name
    if (emojiNamePattern.test(it.profileName)) {
      reasons.push({
        type: 'emoji_name',
        label: `Tên chứa emoji/ký tự đặc biệt ("${it.profileName}") — dấu hiệu tài khoản ảo`,
      });
    }

    // No last name (single word)
    if (hasNoLastName(it.profileName)) {
      reasons.push({
        type: 'no_lastname',
        label: `Tên chỉ có một từ ("${it.profileName}") — tài khoản thật thường có họ + tên`,
      });
    }

    // Foreign script in name (Chinese/Thai/Arabic etc.)
    for (const pattern of foreignNamePatterns) {
      if (pattern.test(it.profileName)) {
        reasons.push({
          type: 'foreign_name',
          label: `Tên chứa ký tự nước ngoài ("${it.profileName}") — có thể là tài khoản clone nước khác`,
        });
        break;
      }
    }

    // Keyword / marketing name
    for (const pattern of keywordNamePatterns) {
      if (pattern.test(it.profileName)) {
        reasons.push({
          type: 'keyword_name',
          label: `Tên chứa từ khóa marketing/farm ("${it.profileName}") — tài khoản trang trại/spam`,
        });
        break;
      }
    }

    // Junk name with many special characters
    if (junkNamePattern.test(it.profileName)) {
      reasons.push({
        type: 'bot_name',
        label: `Tên chứa nhiều ký tự đặc biệt ("${it.profileName}") — không giống tên thật`,
      });
    }

    // Track duplicates
    const nameKey = it.profileName.trim().toLowerCase();
    if (nameKey) {
      const indices = namesSeen.get(nameKey) ?? [];
      indices.push(idx);
      namesSeen.set(nameKey, indices);
    }

    // Track content duplicates
    const contentKey = it.content?.trim().toLowerCase() ?? '';
    if (contentKey && contentKey.length > 0) {
      const indices = contentSeen.get(contentKey) ?? [];
      indices.push(idx);
      contentSeen.set(contentKey, indices);
    }

    // Determine confidence
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (reasons.length >= 3) confidence = 'high';
    else if (reasons.length >= 2) confidence = 'medium';

    const threatCategory = reasons.length > 0 ? classifyThreat(reasons) : 'clean';

    flagged.push({
      index: idx,
      profileName: it.profileName || '(không rõ tên)',
      profileUrl: it.profileUrl,
      interactionType: it.interactionType,
      reasons,
      content: it.content,
      confidence,
      threatCategory,
    });
  });

  // Mark duplicate names
  for (const [, indices] of namesSeen) {
    if (indices.length > 1) {
      for (let i = 1; i < indices.length; i++) {
        const existing = flagged.find((f) => f.index === indices[i]);
        if (existing) {
          existing.reasons.push({
            type: 'duplicate_name',
            label: `Tên "${interactions[indices[i]].profileName}" xuất hiện ${indices.length} lần — tool spam dùng cùng tên`,
          });
          if (existing.confidence === 'low') existing.confidence = 'medium';
          existing.threatCategory = classifyThreat(existing.reasons);
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
            threatCategory: 'tool',
          });
        }
      }
    }
  }

  // Mark repeated content
  for (const [, indices] of contentSeen) {
    if (indices.length >= 3) {
      for (let i = 0; i < indices.length; i++) {
        const existing = flagged.find((f) => f.index === indices[i]);
        if (existing) {
          existing.reasons.push({
            type: 'repeated_content',
            label: `Comment "${interactions[indices[i]].content?.trim().slice(0, 40)}" lặp lại ${indices.length} lần — tool spam copy-paste`,
          });
          if (existing.confidence === 'low') existing.confidence = 'medium';
          existing.threatCategory = classifyThreat(existing.reasons);
        } else {
          flagged.push({
            index: indices[i],
            profileName: interactions[indices[i]].profileName || '(không rõ tên)',
            profileUrl: interactions[indices[i]].profileUrl,
            interactionType: interactions[indices[i]].interactionType,
            reasons: [{
              type: 'repeated_content',
              label: `Comment "${interactions[indices[i]].content?.trim().slice(0, 40)}" lặp lại ${indices.length} lần`,
            }],
            content: interactions[indices[i]].content,
            confidence: 'medium',
            threatCategory: 'tool',
          });
        }
      }
    }
  }

  // Sort: highest confidence first, clean last
  const confidenceOrder = { high: 0, medium: 1, low: 2, clean: 3 };
  flagged.sort((a, b) => {
    const catDiff = (a.threatCategory === 'clean' ? 1 : 0) - (b.threatCategory === 'clean' ? 1 : 0);
    if (catDiff !== 0) return catDiff;
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
  });

  // Generate aggregate signals
  let emptyProfileCount = 0;
  let newAccountCount = 0;
  let noPhotoCount = 0;
  let genericCommentCount = 0;
  let spamCount = 0;
  let botNameCount = 0;
  let duplicateNames = 0;
  let linkSpamCount = 0;
  let scriptedCount = 0;
  let repeatedContentCount = 0;
  let numberedNameCount = 0;
  let noLastNameCount = 0;
  let foreignNameCount = 0;
  let emojiNameCount = 0;
  let keywordNameCount = 0;

  for (const f of flagged) {
    for (const r of f.reasons) {
      if (r.type === 'empty_profile') emptyProfileCount++;
      if (r.type === 'new_account') newAccountCount++;
      if (r.type === 'no_photo') noPhotoCount++;
      if (r.type === 'generic_comment') genericCommentCount++;
      if (r.type === 'spam_pattern') spamCount++;
      if (r.type === 'bot_name') botNameCount++;
      if (r.type === 'duplicate_name') duplicateNames++;
      if (r.type === 'link_spam') linkSpamCount++;
      if (r.type === 'scripted_pattern') scriptedCount++;
      if (r.type === 'repeated_content') repeatedContentCount++;
      if (r.type === 'numbered_name') numberedNameCount++;
      if (r.type === 'no_lastname') noLastNameCount++;
      if (r.type === 'foreign_name') foreignNameCount++;
      if (r.type === 'emoji_name') emojiNameCount++;
      if (r.type === 'keyword_name') keywordNameCount++;
    }
  }

  const emptyPct = (emptyProfileCount / total) * 100;
  const newPct = (newAccountCount / total) * 100;
  const noPhotoPct = (noPhotoCount / total) * 100;
  const genericPct = (genericCommentCount / total) * 100;

  if (emptyPct >= 30) {
    signals.push({
      type: 'empty_profiles',
      description: `${emptyProfileCount}/${total} (${emptyPct.toFixed(0)}%) tài khoản có trang cá nhân trống — dấu hiệu nick buff.`,
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
      description: `${genericCommentCount} bình luận ngắn/generic — dấu hiệu comment tự động bằng tool.`,
      severity: genericPct >= 70 ? 'danger' : 'warning',
    });
  }

  if (spamCount > 0) {
    signals.push({
      type: 'spam_content',
      description: `${spamCount} comment chứa nội dung scam/hack/quảng cáo.`,
      severity: spamCount >= 5 ? 'danger' : 'warning',
    });
  }

  if (linkSpamCount > 0) {
    signals.push({
      type: 'link_spam',
      description: `${linkSpamCount} comment chứa link ngoài/liên kết đáng ngờ — dấu hiệu hack/scam.`,
      severity: linkSpamCount >= 3 ? 'danger' : 'warning',
    });
  }

  if (scriptedCount > 0) {
    signals.push({
      type: 'scripted_patterns',
      description: `${scriptedCount} comment có cấu trúc template/lặp — dấu hiệu script tự động.`,
      severity: scriptedCount >= 3 ? 'danger' : 'warning',
    });
  }

  if (botNameCount > 0) {
    signals.push({
      type: 'bot_names',
      description: `${botNameCount} tài khoản có tên theo pattern tự động — dấu hiệu tool tạo hàng loạt.`,
      severity: botNameCount >= 3 ? 'danger' : 'warning',
    });
  }

  if (duplicateNames > 0) {
    signals.push({
      type: 'duplicate_names',
      description: `${duplicateNames} tên tài khoản lặp lại — tool spam dùng cùng tài khoản.`,
      severity: duplicateNames >= 5 ? 'danger' : 'warning',
    });
  }

  if (repeatedContentCount > 0) {
    signals.push({
      type: 'repeated_content',
      description: `${repeatedContentCount} comment trùng nội dung — tool copy-paste hàng loạt.`,
      severity: repeatedContentCount >= 5 ? 'danger' : 'warning',
    });
  }

  if (numberedNameCount > 0) {
    signals.push({
      type: 'numbered_names',
      description: `${numberedNameCount} tài khoản có tên chứa số — tài khoản thật hiếm khi có số dài trong tên.`,
      severity: numberedNameCount >= 3 ? 'danger' : 'warning',
    });
  }

  if (noLastNameCount > 0) {
    signals.push({
      type: 'no_lastname',
      description: `${noLastNameCount} tài khoản chỉ có tên không có họ — dấu hiệu tạo nhanh.`,
      severity: noLastNameCount >= 5 ? 'danger' : 'warning',
    });
  }

  if (foreignNameCount > 0) {
    signals.push({
      type: 'foreign_names',
      description: `${foreignNameCount} tài khoản có tên bằng ký tự nước ngoài — có thể là tài khoản clone.`,
      severity: foreignNameCount >= 3 ? 'danger' : 'warning',
    });
  }

  if (emojiNameCount > 0) {
    signals.push({
      type: 'emoji_names',
      description: `${emojiNameCount} tài khoản có emoji/ký tự đặc biệt trong tên — dấu hiệu tài khoản ảo.`,
      severity: emojiNameCount >= 3 ? 'danger' : 'warning',
    });
  }

  if (keywordNameCount > 0) {
    signals.push({
      type: 'keyword_names',
      description: `${keywordNameCount} tài khoản có tên chứa từ khóa marketing/farm — tài khoản trang trại.`,
      severity: 'danger',
    });
  }

  return { flagged, signals };
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

function estimateFakeAccounts(
  input: ScanInput,
  signals: DetectedSignal[],
  interactionResult: { flagged: FlaggedAccount[]; signals: DetectedSignal[] }
): FakeEstimate {
  const totalReactions = input.totalReactions;
  const totalComments = input.totalComments;
  const totalShares = input.totalShares;
  const totalEng = totalReactions + totalComments + totalShares;

  const signalTypes = new Set(signals.map((s) => s.type));
  const dangerCount = signals.filter((s) => s.severity === 'danger').length;
  const warningCount = signals.filter((s) => s.severity === 'warning').length;

  // Compute per-type fake rates based on signals
  let reactFakeRate = 0;
  let commentFakeRate = 0;
  let shareFakeRate = 0;
  let methodParts: string[] = [];

  if (totalEng === 0) {
    return {
      totalFake: 0, buff: 0, tool: 0, hack: 0, real: 0, total: 0,
      confidence: 'low', method: 'Không có dữ liệu tương tác',
      fakeReactions: 0, fakeComments: 0, fakeShares: 0,
      realReactions: 0, realComments: 0, realShares: 0,
    };
  }

  // --- REACTION fake rate ---
  const ratio = totalComments > 0 ? totalReactions / totalComments : 0;
  if (signalTypes.has('extreme_reaction_comment_ratio') || ratio > 100) {
    reactFakeRate = 0.70;
    methodParts.push('Tỷ lệ react/comment cực cao (>100:1) — ~70% react là ảo');
  } else if (signalTypes.has('high_reaction_comment_ratio') || ratio > 50) {
    reactFakeRate = 0.45;
    methodParts.push('Tỷ lệ react/comment cao (>50:1) — ~45% react là ảo');
  } else if (ratio > 30 && totalReactions > 200) {
    reactFakeRate = 0.25;
    methodParts.push('Tỷ lệ react/comment hơi cao — ~25% react là ảo');
  } else {
    reactFakeRate = 0.10;
    methodParts.push('Tỷ lệ react/comment bình thường — ~10% react là ảo');
  }

  // Reaction breakdown adjustments
  const bd = input.reactionBreakdown;
  const bdTotal = Object.values(bd).reduce((a, b) => a + (b ?? 0), 0);
  if (bdTotal > 0) {
    const likePct = ((bd.like ?? 0) / bdTotal) * 100;
    if (likePct >= 95) {
      reactFakeRate = Math.min(reactFakeRate + 0.15, 0.90);
      methodParts.push('95%+ là Like (tool buff thường chỉ dùng Like)');
    }
    const reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry'] as const;
    const nonZero = reactionTypes.filter((t) => (bd[t] ?? 0) > 0);
    if (nonZero.length >= 4) {
      const values = nonZero.map((t) => bd[t] ?? 0);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
      const cv = avg > 0 ? Math.sqrt(variance) / avg : 0;
      if (cv < 0.1) {
        reactFakeRate = Math.min(reactFakeRate + 0.10, 0.90);
        methodParts.push('phân bổ react quá đều (dấu hiệu tool)');
      }
    }
  }

  // Timing adjustments affect all types
  if (signalTypes.has('burst_engagement')) {
    reactFakeRate = Math.min(reactFakeRate + 0.15, 0.95);
    commentFakeRate += 0.15;
    shareFakeRate += 0.15;
    methodParts.push('tương tác bùng nổ trong <1 giờ');
  } else if (signalTypes.has('rapid_engagement')) {
    reactFakeRate = Math.min(reactFakeRate + 0.08, 0.90);
    commentFakeRate += 0.08;
    shareFakeRate += 0.08;
    methodParts.push('tương tác tăng nhanh bất thường');
  }

  // --- COMMENT fake rate ---
  if (signalTypes.has('low_comment_high_reaction')) {
    // Many reacts but very few comments — comments that exist are likely real
    commentFakeRate = 0.15;
    methodParts.push('nhiều react nhưng quá ít comment → comment ít ảo hơn');
  } else {
    commentFakeRate = Math.max(reactFakeRate - 0.10, 0.05);
  }
  if (signalTypes.has('generic_comments') || signalTypes.has('repeated_content')) {
    commentFakeRate = Math.min(commentFakeRate + 0.20, 0.85);
    methodParts.push('comment ngắn/generic lặp lại — comment ảo cao');
  }
  if (signalTypes.has('bot_names') || signalTypes.has('duplicate_names')) {
    commentFakeRate = Math.min(commentFakeRate + 0.15, 0.85);
  }
  if (signalTypes.has('spam_content') || signalTypes.has('link_spam') || signalTypes.has('scripted_patterns')) {
    commentFakeRate = Math.min(commentFakeRate + 0.15, 0.90);
  }

  // --- SHARE fake rate ---
  if (signalTypes.has('high_share_ratio')) {
    shareFakeRate = 0.50;
    methodParts.push('tỷ lệ share cao bất thường — ~50% share là ảo');
  } else if (signalTypes.has('zero_shares')) {
    shareFakeRate = 0.05;
  } else {
    shareFakeRate = Math.max(reactFakeRate - 0.05, 0.05);
  }
  if (signalTypes.has('burst_engagement')) {
    shareFakeRate = Math.min(shareFakeRate + 0.10, 0.90);
  }

  // Danger signals bump all
  if (dangerCount >= 3) {
    reactFakeRate = Math.min(reactFakeRate + 0.08, 0.95);
    commentFakeRate = Math.min(commentFakeRate + 0.08, 0.95);
    shareFakeRate = Math.min(shareFakeRate + 0.08, 0.95);
  }

  // If we have interaction samples, use actual flagged rate to refine
  if (input.interactions.length > 0 && interactionResult.flagged.length > 0) {
    const flagged = interactionResult.flagged;
    const sampleTotal = input.interactions.length;
    const sampleFake = flagged.filter((f) => f.threatCategory !== 'clean').length;
    const sampleRate = sampleTotal > 0 ? sampleFake / sampleTotal : 0;
    // Blend: weight sample rate 60%, metric-based rate 40%
    reactFakeRate = reactFakeRate * 0.4 + sampleRate * 0.6;
    commentFakeRate = commentFakeRate * 0.4 + sampleRate * 0.6;
    shareFakeRate = shareFakeRate * 0.4 + sampleRate * 0.6;
    methodParts.unshift(`Dựa trên ${sampleTotal} mẫu tài khoản (${(sampleRate * 100).toFixed(0)}% là ảo) + số liệu tương tác`);
  }

  // Clamp
  reactFakeRate = Math.min(Math.max(reactFakeRate, 0), 0.95);
  commentFakeRate = Math.min(Math.max(commentFakeRate, 0), 0.95);
  shareFakeRate = Math.min(Math.max(shareFakeRate, 0), 0.95);

  const fakeReactions = Math.round(reactFakeRate * totalReactions);
  const fakeComments = Math.round(commentFakeRate * totalComments);
  const fakeShares = Math.round(shareFakeRate * totalShares);
  const realReactions = Math.max(totalReactions - fakeReactions, 0);
  const realComments = Math.max(totalComments - fakeComments, 0);
  const realShares = Math.max(totalShares - fakeShares, 0);

  const totalFake = fakeReactions + fakeComments + fakeShares;
  const real = realReactions + realComments + realShares;

  // Split into buff/tool/hack
  let buffRate = 0.5;
  let toolRate = 0.3;
  let hackRate = 0.2;
  if (signalTypes.has('like_dominant') || signalTypes.has('uniform_reactions')) {
    buffRate += 0.15;
    toolRate -= 0.05;
  }
  if (signalTypes.has('bot_names') || signalTypes.has('duplicate_names') || signalTypes.has('repeated_content')) {
    toolRate += 0.15;
    buffRate -= 0.10;
  }
  if (signalTypes.has('spam_content') || signalTypes.has('link_spam') || signalTypes.has('scripted_patterns')) {
    hackRate += 0.15;
    buffRate -= 0.05;
  }
  const sum = buffRate + toolRate + hackRate;
  buffRate /= sum;
  toolRate /= sum;
  hackRate /= sum;
  const buff = Math.round(totalFake * buffRate);
  const tool = Math.round(totalFake * toolRate);
  const hack = Math.max(totalFake - buff - tool, 0);

  const confidence: 'high' | 'medium' | 'low' =
    dangerCount >= 2 ? 'high' : dangerCount >= 1 || warningCount >= 3 ? 'medium' : 'low';

  return {
    totalFake,
    buff,
    tool,
    hack,
    real,
    total: totalEng,
    confidence,
    method: methodParts.join(', '),
    fakeReactions,
    fakeComments,
    fakeShares,
    realReactions,
    realComments,
    realShares,
  };
}

function calculateVoteScore(
  input: ScanInput,
  fakeEstimate: FakeEstimate,
  interactionResult: { flagged: FlaggedAccount[] }
): VoteScore {
  const realReactions = fakeEstimate.realReactions;
  const realShares = fakeEstimate.realShares;
  const realComments = fakeEstimate.realComments;

  // Deduplicate real comment accounts: each account only counted 1 comment
  const flaggedAccountNames = new Set(
    interactionResult.flagged
      .filter((f) => f.threatCategory !== 'clean' && f.interactionType === 'comment')
      .map((f) => f.profileName.trim().toLowerCase())
      .filter((n) => n.length > 0)
  );

  const realCommentAccountNames = new Set<string>();
  for (const it of input.interactions) {
    if (it.interactionType !== 'comment') continue;
    const nameKey = it.profileName.trim().toLowerCase();
    if (!nameKey || flaggedAccountNames.has(nameKey)) continue;
    realCommentAccountNames.add(nameKey);
  }

  // If we have sample data, use the unique real commenter count; otherwise use estimated total
  const uniqueRealComments = realCommentAccountNames.size > 0
    ? realCommentAccountNames.size
    : realComments;

  const reactVotes = realReactions * 1;         // 1 react = 1 vote
  const commentVotes = uniqueRealComments * 2;  // 1 cmt = 2 vote (mỗi account 1 lượt)
  const shareVotes = realShares * 5;            // 1 share = 5 votes
  const totalVotes = reactVotes + commentVotes + shareVotes;

  const fakeComments = fakeEstimate.fakeComments;
  const deductedAccounts = fakeEstimate.fakeReactions + fakeComments + fakeEstimate.fakeShares;

  const formula = `1 react = 1 vote · 1 cmt = 2 vote (mỗi account 1 lượt) · 1 share = 5 vote. Đã trừ ${deductedAccounts.toLocaleString('vi-VN')} tương tác ảo (react ${fakeEstimate.fakeReactions.toLocaleString('vi-VN')} + cmt ${fakeComments.toLocaleString('vi-VN')} + share ${fakeEstimate.fakeShares.toLocaleString('vi-VN')}). Cmt thật: ${uniqueRealComments.toLocaleString('vi-VN')} lượt (đã trùng).`;

  return {
    totalVotes,
    reactVotes,
    commentVotes,
    shareVotes,
    realReactions,
    realComments: uniqueRealComments,
    realShares,
    fakeReactions: fakeEstimate.fakeReactions,
    fakeComments,
    fakeShares: fakeEstimate.fakeShares,
    deductedAccounts,
    formula,
  };
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

  const allAccounts = interactionResult.flagged;
  const flaggedOnly = allAccounts.filter((a) => a.threatCategory !== 'clean');

  const fakeEstimate = estimateFakeAccounts(input, allSignals, interactionResult);
  const voteScore = calculateVoteScore(input, fakeEstimate, interactionResult);

  return {
    riskScore: score,
    riskLevel: classifyRisk(score),
    detectedSignals: allSignals,
    engagementRatio: Math.round(engagementResult.ratio * 10) / 10,
    suspiciousInteractionCount: flaggedOnly.length,
    totalInteractionCount: input.interactions.length,
    flaggedAccounts: flaggedOnly,
    allAccounts,
    fakeEstimate,
    voteScore,
  };
}
