import { useState } from 'react';
import type { FlaggedAccount, FlagReason, ThreatCategory } from '@/lib/types';
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
  Link2Off,
  Terminal,
  Repeat,
  Zap,
  ShieldAlert,
  ShieldX,
  CheckCircle2,
  Hash,
  Globe,
  Tag,
  Sparkles,
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
  repeated_content: <Repeat className="h-4 w-4 text-purple-500" />,
  link_spam: <Link2Off className="h-4 w-4 text-red-600" />,
  scripted_pattern: <Terminal className="h-4 w-4 text-red-600" />,
  numbered_name: <Hash className="h-4 w-4 text-orange-500" />,
  no_lastname: <UserX className="h-4 w-4 text-amber-500" />,
  foreign_name: <Globe className="h-4 w-4 text-orange-600" />,
  emoji_name: <Sparkles className="h-4 w-4 text-purple-400" />,
  keyword_name: <Tag className="h-4 w-4 text-red-500" />,
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
  high: { label: 'Chắc chắn', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', icon: <Skull className="h-3.5 w-3.5" /> },
  medium: { label: 'Nghi ngờ cao', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  low: { label: 'Đáng ngờ', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  clean: { label: 'Sạch', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
};

type TabKey = 'all' | ThreatCategory;

const threatConfig: Record<ThreatCategory, {
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  bg: string;
  text: string;
  border: string;
  gradient: string;
  description: string;
}> = {
  buff: {
    label: 'Buff tương tác',
    shortLabel: 'BUFF',
    icon: <Zap className="h-4 w-4" />,
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-300',
    gradient: 'from-orange-500 to-amber-500',
    description: 'Tài khoản tạo ra để tăng giả tương tác (react, comment, share) — nick ảo clone, trang trống, không ảnh.',
  },
  tool: {
    label: 'Tool tự động',
    shortLabel: 'TOOL',
    icon: <Bot className="h-4 w-4" />,
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-300',
    gradient: 'from-purple-500 to-fuchsia-500',
    description: 'Tài khoản chạy bằng tool/bot — tên tự động, comment copy-paste, spam hàng loạt.',
  },
  hack: {
    label: 'Hack / Scam',
    shortLabel: 'HACK',
    icon: <Terminal className="h-4 w-4" />,
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    gradient: 'from-red-500 to-rose-600',
    description: 'Tài khoản phát tán link độc hại, scam, hack — comment chứa link ngoài, nội dung lừa đảo.',
  },
  clean: {
    label: 'Tài khoản sạch',
    shortLabel: 'SẠCH',
    icon: <CheckCircle2 className="h-4 w-4" />,
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    gradient: 'from-emerald-500 to-teal-500',
    description: 'Tài khoản không phát hiện dấu hiệu ảo — có vẻ là tương tác thật.',
  },
};

export function FlaggedAccountsList({ accounts }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 py-10 text-center">
        <CheckCircle2 className="mb-2 h-10 w-10 text-emerald-500" />
        <p className="text-sm font-semibold text-emerald-800">
          Không phát hiện tài khoản ảo nào trong mẫu kiểm tra
        </p>
        <p className="mt-1 text-xs text-emerald-600">
          Các tài khoản tương tác có vẻ thật. Lưu ý: kết quả phụ thuộc vào số mẫu bạn nhập.
        </p>
      </div>
    );
  }

  const counts = {
    buff: accounts.filter((a) => a.threatCategory === 'buff').length,
    tool: accounts.filter((a) => a.threatCategory === 'tool').length,
    hack: accounts.filter((a) => a.threatCategory === 'hack').length,
    clean: accounts.filter((a) => a.threatCategory === 'clean').length,
  };

  const tabs: { key: TabKey; label: string; count: number; icon?: React.ReactNode }[] = [
    { key: 'all', label: 'Tất cả', count: accounts.length, icon: <ShieldAlert className="h-4 w-4" /> },
    { key: 'buff', label: threatConfig.buff.label, count: counts.buff, icon: threatConfig.buff.icon },
    { key: 'tool', label: threatConfig.tool.label, count: counts.tool, icon: threatConfig.tool.icon },
    { key: 'hack', label: threatConfig.hack.label, count: counts.hack, icon: threatConfig.hack.icon },
    { key: 'clean', label: threatConfig.clean.label, count: counts.clean, icon: threatConfig.clean.icon },
  ];

  const filteredAccounts = activeTab === 'all'
    ? accounts
    : accounts.filter((a) => a.threatCategory === activeTab);

  const highCount = accounts.filter((a) => a.confidence === 'high').length;
  const mediumCount = accounts.filter((a) => a.confidence === 'medium').length;
  const lowCount = accounts.filter((a) => a.confidence === 'low').length;

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldX className="h-5 w-5 text-red-600" />
          <h4 className="text-sm font-bold text-red-800">
            Phát hiện {accounts.length - counts.clean} tài khoản nguy hiểm / {accounts.length} tổng
          </h4>
        </div>

        {/* Threat category summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['buff', 'tool', 'hack', 'clean'] as ThreatCategory[]).map((cat) => {
            const cfg = threatConfig[cat];
            const count = counts[cat];
            if (count === 0) return null;
            return (
              <div
                key={cat}
                className={`rounded-lg border ${cfg.border} ${cfg.bg} p-3 text-center`}
              >
                <div className={`mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${cfg.gradient} text-white`}>
                  {cfg.icon}
                </div>
                <p className={`text-xl font-bold ${cfg.text}`}>{count}</p>
                <p className="text-xs font-semibold text-gray-600">{cfg.shortLabel}</p>
              </div>
            );
          })}
        </div>

        {/* Confidence breakdown */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-red-600 px-3 py-1 font-semibold text-white">
            {highCount} chắc chắn
          </span>
          <span className="rounded-full bg-amber-500 px-3 py-1 font-semibold text-white">
            {mediumCount} nghi ngờ cao
          </span>
          <span className="rounded-full bg-yellow-400 px-3 py-1 font-semibold text-yellow-900">
            {lowCount} đáng ngờ
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          if (tab.count === 0 && tab.key !== 'all') return null;
          const isActive = activeTab === tab.key;
          const tabColor =
            tab.key === 'buff' ? 'text-orange-700 border-orange-400 bg-orange-50' :
            tab.key === 'tool' ? 'text-purple-700 border-purple-400 bg-purple-50' :
            tab.key === 'hack' ? 'text-red-700 border-red-400 bg-red-50' :
            tab.key === 'clean' ? 'text-emerald-700 border-emerald-400 bg-emerald-50' :
            'text-gray-700 border-gray-300 bg-white';
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? tabColor
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-bold ${
                isActive ? 'bg-white/60' : 'bg-gray-100'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active category description */}
      {activeTab !== 'all' && (
        <div className={`rounded-lg border ${threatConfig[activeTab].border} ${threatConfig[activeTab].bg} px-4 py-3`}>
          <div className="flex items-start gap-2">
            {threatConfig[activeTab].icon}
            <p className={`text-xs leading-relaxed ${threatConfig[activeTab].text}`}>
              {threatConfig[activeTab].description}
            </p>
          </div>
        </div>
      )}

      {/* Account list */}
      <div className="space-y-3">
        {filteredAccounts.map((acc, idx) => {
          const conf = confidenceConfig[acc.confidence];
          const threat = threatConfig[acc.threatCategory];
          return (
            <div
              key={acc.index}
              className={`rounded-xl border-2 ${conf.border} bg-white p-4 transition-all hover:shadow-md`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${threat.gradient} text-white shadow-sm`}>
                    {threat.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="truncate text-sm font-bold text-gray-900">
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
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${threat.gradient} px-3 py-1 text-xs font-bold text-white shadow-sm`}>
                    {threat.icon}
                    {threat.shortLabel}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full ${conf.bg} ${conf.text} px-2.5 py-0.5 text-xs font-medium`}>
                    {conf.icon}
                    {conf.label}
                  </span>
                </div>
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
                {acc.reasons.length > 0 ? (
                  <>
                    <p className="text-xs font-semibold text-gray-700">
                      Bằng chứng ({acc.reasons.length}):
                    </p>
                    {acc.reasons.map((reason, ri) => (
                      <div key={ri} className="flex items-start gap-2 rounded-lg bg-gray-50/50 px-2 py-1.5">
                        {reasonIcon[reason.type]}
                        <p className="text-xs text-gray-600 leading-relaxed">{reason.label}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="flex items-center gap-2 text-xs text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Không phát hiện dấu hiệu ảo — tài khoản có vẻ thật
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
