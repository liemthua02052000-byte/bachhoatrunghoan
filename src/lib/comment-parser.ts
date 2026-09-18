import type { InteractionEntry } from './types';

interface ParsedAccount {
  name: string;
  content?: string;
}

export function parseFacebookComments(raw: string): ParsedAccount[] {
  const lines = raw.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const accounts: ParsedAccount[] = [];
  let i = 0;

  // Facebook comment structure when copy-pasted:
  // "Tên Người Dùng\nNội dung comment\n  · Reply · Share · Like · 1h"
  // Or: "Tên Người Dùng · 2 mutual friends\nNội dung comment"
  // Or just: "Tên\nComment text" (simpler paste)
  while (i < lines.length) {
    const line = lines[i];

    // Skip meta lines (timestamps, engagement counts, "View more comments", etc.)
    if (isMetaLine(line)) {
      i++;
      continue;
    }

    // Try to detect a name line followed by content
    const name = extractName(line);
    if (!name) {
      i++;
      continue;
    }

    // Look ahead for comment content (next non-meta line)
    let content: string | undefined;
    let j = i + 1;
    while (j < lines.length && isMetaLine(lines[j])) {
      j++;
    }
    if (j < lines.length && !isMetaLine(lines[j])) {
      const nextName = extractName(lines[j]);
      // If the next line looks like another name (short, no punctuation), treat current as name-only
      if (nextName && looksLikeName(lines[j]) && !looksLikeName(line)) {
        // Current line is content for previous, next is name — skip
        i++;
        continue;
      }
      if (!nextName || (nextName && !looksLikeName(lines[j]))) {
        content = lines[j];
        i = j + 1;
      } else {
        i++;
      }
    } else {
      i++;
    }

    accounts.push({ name, content });
  }

  // Deduplicate by name, keeping first occurrence
  const seen = new Set<string>();
  return accounts.filter((a) => {
    const key = a.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isMetaLine(line: string): boolean {
  const lower = line.toLowerCase();
  // Facebook UI elements
  if (lower.includes('· reply') || lower.includes('· share') || lower.includes('· like') || lower.includes('· reacted')) return true;
  if (lower.includes('view more comments') || lower.includes('xem thêm bình luận')) return true;
  if (lower.includes('view all comments') || lower.includes('xem tất cả')) return true;
  if (lower.includes('most relevant') || lower.includes('tất cả bình luận')) return true;
  if (/^\d+\s*(comment|bình luận|react|reaction)/i.test(lower)) return true;
  if (/^·\s/.test(line)) return true;
  // Timestamps like "1h", "2d", "just now", "vừa xong"
  if (/^\d+\s*(h|g|p|phút|d|ngày|w|tuần|mo|tháng|y|năm)\b/i.test(lower)) return true;
  if (/^(just now|vừa xong|mới vừa)/i.test(lower)) return true;
  // Engagement counts
  if (/^\d+\s*(like|thích|love|yêu|haha|wow|sad|buồn|angry|phẫn nộ)/i.test(lower)) return true;
  if (/^(like|thích|love|yêu|share|chia sẻ|comment|bình luận)\s*·/i.test(lower)) return true;
  // Empty or very short UI text
  if (line.length <= 1) return true;
  return false;
}

function extractName(line: string): string | null {
  // Remove leading bullets, badges, etc.
  let cleaned = line.replace(/^[·•\-\s]+/, '').trim();

  // Remove "X mutual friends" / "X bạn chung" suffix
  cleaned = cleaned.replace(/\s·\s\d+\s(bạn chung|mutual friends?)$/i, '');
  // Remove "Top contributor" / "Người đóng góp"
  cleaned = cleaned.replace(/\s·\s(top contributor|người đóng góp)$/i, '');
  // Remove trailing " · " meta
  cleaned = cleaned.replace(/\s·\s.*$/, '').trim();

  if (cleaned.length < 2 || cleaned.length > 80) return null;
  // Skip if it looks like a URL or pure number
  if (/^https?:\/\//i.test(cleaned)) return null;
  if (/^\d+$/.test(cleaned)) return null;

  return cleaned;
}

function looksLikeName(line: string): boolean {
  // A name is typically 2-5 words, no trailing punctuation, no URLs
  const words = line.trim().split(/\s+/);
  if (words.length > 6) return false;
  if (/[.!?,;:]/.test(line.trim().slice(-1))) return false;
  if (/https?:\/\//i.test(line)) return false;
  return true;
}

export function parsedToInteractions(parsed: ParsedAccount[]): InteractionEntry[] {
  return parsed.map((p) => ({
    interactionType: 'comment' as const,
    profileName: p.name,
    isEmptyProfile: false,
    isNewAccount: false,
    hasProfilePhoto: true,
    content: p.content,
  }));
}
