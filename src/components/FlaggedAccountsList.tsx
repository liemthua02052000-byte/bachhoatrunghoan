import type { FlaggedAccount, FlagReason } from '@/lib/types';
import {
  UserX,
  AlertTriangle,
  Skull,
  MessageSquare,
  Share2,
  ThumbsUp,
  Copy,
  Trash2,
  Bot,
  ImageOff,
  CalendarPlus,
  ExternalLink,
  Search,
} from 'lucide-react';

interface Props {
  accounts: FlaggedAccount[];
}

const reasonIcon: Record<FlagReason, React.ReactNode> = {
  empty_profile: <UserX className="h-4 w-4 text-red-500" />,
  new_account: <CalendarPlus className="h-4 w-4 text-amber-500" />,
  no_photo: <ImageOff className="h-4 w-4 text-orange-500" />,
  generic_comment: <MessageSquare className="h-4 w-4 text-yellow-500" />,
  duplicate_name: <Copy className="h-4 w-4 text-purple-500" />,
  spam_pattern: <Trash2 className="h-4 w-4 text-red-600" />,
  bot_name: <Bot className="h-4 w-4 text-red-500" />,
};

const interactionIcon = {
  react: <ThumbsUp className="h-3.5 w-3.5 text-blue-500" />,
  comment: <MessageSquare className="h-3.5 w-3.5 text-green-500" />,
  share: <Share2 className="h-3.5 w-3.5 text-purple-500" />,
};

const interactionLabel = {
  react: 'React',
  comment: 'Comment',
  share: 'Share',
};

const confidenceConfig = {
  high: { label: 'Chắc chắn là nick ảo', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', icon: <Skull className="h-3.5 w-3.5" /> },
  medium: { label: 'Nghi ngờ cao', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  low: { label: 'Đáng ngờ', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
};

export function FlaggedAccountsList({ accounts }: Props) {
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 py-8 text-center">
        <Search className="mb-2 h-8 w-8 text-emerald-500" />
        <p className="text-sm font-medium text-emerald-800">
          Không phát hiện tài khoản ảo nào trong mẫu kiểm tra
        </p>
        <p className="mt-1 text-xs text-emerald-600">
          Các tài khoản tương tác có vẻ thật. Lưu ý: kết quả phụ thuộc vào số mẫu bạn nhập.
        </p>
      </div>
    );
  }

  const highCount = accounts.filter((a) => a.confidence === 'high').length;
  const mediumCount = accounts.filter((a) => a.confidence === 'medium').length;
  const lowCount = accounts.filter((a) => a.confidence === 'low').length;

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Skull className="h-5 w-5 text-red-600" />
          <h4 className="text-sm font-bold text-red-800">
            Danh sách {accounts.length} tài khoản nghi ảo
          </h4>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="rounded-full bg-red-600 px-3 py-1 font-semibold text-white">
            {highCount} chắc chắn ảo
          </span>
          <span className="rounded-full bg-amber-500 px-3 py-1 font-semibold text-white">
            {mediumCount} nghi ngờ cao
          </span>
          <span className="rounded-full bg-yellow-400 px-3 py-1 font-semibold text-yellow-900">
            {lowCount} đáng ngờ
          </span>
        </div>
      </div>

      {/* Account list */}
      <div className="space-y-3">
        {accounts.map((acc, idx) => {
          const conf = confidenceConfig[acc.confidence];
          return (
            <div
              key={acc.index}
              className={`rounded-xl border-2 ${conf.border} bg-white p-4 transition-all hover:shadow-md`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${conf.bg}`}>
                    <Bot className={`h-5 w-5 ${conf.text}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-gray-900">
                        #{idx + 1} {acc.profileName}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {interactionIcon[acc.interactionType]}
                        {interactionLabel[acc.interactionType]}
                      </span>
                    </div>
                    {acc.profileUrl && (
                      <a
                        href={acc.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
                      >
                        Xem trang <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full ${conf.bg} ${conf.text} px-3 py-1 text-xs font-semibold`}>
                  {conf.icon}
                  {conf.label}
                </span>
              </div>

              {/* Comment content if any */}
              {acc.content && acc.content.trim() && (
                <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500 mb-0.5">Nội dung:</p>
                  <p className="text-sm text-gray-800 italic">"{acc.content.trim()}"</p>
                </div>
              )}

              {/* Reasons */}
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700">
                  Lý do đánh dấu là nick ảo ({acc.reasons.length}):
                </p>
                {acc.reasons.map((reason, ri) => (
                  <div key={ri} className="flex items-start gap-2">
                    {reasonIcon[reason.type]}
                    <p className="text-xs text-gray-600 leading-relaxed">{reason.label}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
