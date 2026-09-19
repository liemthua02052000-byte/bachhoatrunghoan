import { useState } from 'react';
import type { DetectedSignal, FlaggedAccount, FakeEstimate, VoteScore } from '@/lib/types';
import { RiskGauge } from './RiskBadge';
import { FlaggedAccountsList } from './FlaggedAccountsList';
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Info,
  TrendingUp,
  Users,
  MessageSquare,
  Share2,
  ThumbsUp,
  Clock,
  Heart,
  Smile,
  Zap,
  Frown,
  Angry,
  Bot,
  Terminal,
  CheckCircle2,
  Sparkles,
  Award,
} from 'lucide-react';

interface Props {
  result: {
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    detectedSignals: DetectedSignal[];
    engagementRatio: number;
    suspiciousInteractionCount: number;
    totalInteractionCount: number;
    flaggedAccounts: FlaggedAccount[];
    allAccounts: FlaggedAccount[];
    fakeEstimate: FakeEstimate;
    voteScore?: VoteScore;
  };
  input: {
    totalReactions: number;
    totalComments: number;
    totalShares: number;
    reactionBreakdown: Record<string, number>;
    postContent?: string;
    postDate?: string;
  };
}

const severityIcon = (sev: string) => {
  if (sev === 'danger') return <ShieldAlert className="h-5 w-5 text-red-600 flex-shrink-0" />;
  if (sev === 'warning') return <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />;
  return <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />;
};

const severityBorder = (sev: string) => {
  if (sev === 'danger') return 'border-red-200 bg-red-50';
  if (sev === 'warning') return 'border-amber-200 bg-amber-50';
  return 'border-blue-200 bg-blue-50';
};

export function ScanResult({ result, input }: Props) {
  const [showAllSignals, setShowAllSignals] = useState(false);
  const signals = result.detectedSignals;
  const visibleSignals = showAllSignals ? signals : signals.slice(0, 6);

  const bd = input.reactionBreakdown;
  const reactionTypes = [
    { key: 'like', label: 'Like', icon: ThumbsUp, color: 'text-blue-600' },
    { key: 'love', label: 'Love', icon: Heart, color: 'text-rose-600' },
    { key: 'haha', label: 'Haha', icon: Smile, color: 'text-yellow-600' },
    { key: 'wow', label: 'Wow', icon: Zap, color: 'text-yellow-500' },
    { key: 'sad', label: 'Sad', icon: Frown, color: 'text-yellow-700' },
    { key: 'angry', label: 'Angry', icon: Angry, color: 'text-orange-700' },
  ];

  const totalReactions = Object.values(bd).reduce((a, b) => a + (b ?? 0), 0) || input.totalReactions;

  const verdictText: Record<string, string> = {
    low: 'Bài viết có vẻ an toàn — không phát hiện dấu hiệu buff tương tác đáng kể.',
    medium: 'Có một số dấu hiệu đáng ngờ — nên kiểm tra kỹ hơn trước khi tin tưởng.',
    high: 'Nhiều dấu hiệu cho thấy bài viết có thể bị buff tương tác.',
    critical: 'Rất nhiều bằng chứng cho thấy bài viết bị buff react/comment/share bằng tool.',
  };

  return (
    <div className="space-y-6">
      {/* Verdict banner */}
      <div
        className={`rounded-2xl border p-6 ${
          result.riskLevel === 'critical'
            ? 'border-red-300 bg-red-50'
            : result.riskLevel === 'high'
            ? 'border-orange-300 bg-orange-50'
            : result.riskLevel === 'medium'
            ? 'border-amber-300 bg-amber-50'
            : 'border-emerald-300 bg-emerald-50'
        }`}
      >
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-8">
          <RiskGauge score={result.riskScore} level={result.riskLevel} />
          <div className="flex-1 text-center sm:text-left">
            <div className="mb-2 flex items-center justify-center gap-2 sm:justify-start">
              {result.riskLevel === 'low' ? (
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              ) : (
                <ShieldAlert
                  className={`h-6 w-6 ${
                    result.riskLevel === 'critical'
                      ? 'text-red-600'
                      : result.riskLevel === 'high'
                      ? 'text-orange-600'
                      : 'text-amber-600'
                  }`}
                />
              )}
              <h3 className="text-xl font-bold text-gray-900">
                Kết quả phân tích
              </h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {verdictText[result.riskLevel]}
            </p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<ThumbsUp className="h-5 w-5 text-blue-600" />}
          label="Tổng React"
          value={input.totalReactions.toLocaleString('vi-VN')}
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5 text-green-600" />}
          label="Tổng Comment"
          value={input.totalComments.toLocaleString('vi-VN')}
        />
        <StatCard
          icon={<Share2 className="h-5 w-5 text-purple-600" />}
          label="Tổng Share"
          value={input.totalShares.toLocaleString('vi-VN')}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-orange-600" />}
          label="Tỷ lệ React/Cmt"
          value={result.engagementRatio.toString()}
        />
      </div>

      {/* Reaction breakdown */}
      {totalReactions > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h4 className="mb-4 text-sm font-semibold text-gray-900">Phân bổ loại phản ứng</h4>
          <div className="space-y-3">
            {reactionTypes.map(({ key, label, icon: Icon, color }) => {
              const count = bd[key] ?? 0;
              const pct = totalReactions > 0 ? (count / totalReactions) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${color} flex-shrink-0`} />
                  <span className="w-12 text-xs font-medium text-gray-600">{label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${color.replace('text-', 'bg-')}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-xs font-semibold text-gray-700">
                    {count.toLocaleString('vi-VN')} ({pct.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fake account estimate */}
      {result.fakeEstimate && result.fakeEstimate.total > 0 && (
        <FakeEstimateCard estimate={result.fakeEstimate} />
      )}

      {/* Vote score */}
      {result.voteScore && result.voteScore.totalVotes > 0 && (
        <VoteScoreCard voteScore={result.voteScore} />
      )}

      {/* Interaction analysis */}
      {result.totalInteractionCount > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-700" />
              <span className="text-sm font-semibold text-gray-900">Tài khoản kiểm tra</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {result.totalInteractionCount}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-semibold text-gray-900">Tài khoản đáng ngờ</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-600">
              {result.suspiciousInteractionCount}
            </p>
          </div>
        </div>
      )}

      {/* Flagged accounts list */}
      {result.totalInteractionCount > 0 ? (
        <div>
          <h4 className="mb-3 text-base font-bold text-gray-900">
            Danh sách tài khoản tương tác
          </h4>
          <FlaggedAccountsList accounts={result.allAccounts} />
        </div>
      ) : (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Chưa có dữ liệu tài khoản tương tác
              </p>
              <p className="mt-1 text-sm text-blue-700 leading-relaxed">
                Để kiểm tra từng tài khoản nick ảo, hãy thêm tên các tài khoản comment/react
                vào phần "Mẫu tài khoản tương tác" ở trên rồi bấm Phân tích lại.
                Mỗi tài khoản sẽ được dán nhãn Buff, Tool, Hack, hoặc Sạch.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detected signals */}
      {signals.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">
            Dấu hiệu phát hiện ({signals.length})
          </h4>
          {visibleSignals.map((sig, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 rounded-lg border p-4 ${severityBorder(sig.severity)}`}
            >
              {severityIcon(sig.severity)}
              <p className="text-sm text-gray-800 leading-relaxed">{sig.description}</p>
            </div>
          ))}
          {signals.length > 6 && (
            <button
              onClick={() => setShowAllSignals(!showAllSignals)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {showAllSignals ? 'Thu gọn' : `Xem thêm ${signals.length - 6} dấu hiệu`}
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800">
            Không phát hiện dấu hiệu buff tương tác nào. Bài viết có vẻ hoạt động tự nhiên.
          </p>
        </div>
      )}

      {input.postDate && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="h-4 w-4" />
          <span>Ngày đăng: {new Date(input.postDate).toLocaleString('vi-VN')}</span>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function FakeEstimateCard({ estimate }: { estimate: FakeEstimate }) {
  const fakePct = estimate.total > 0 ? (estimate.totalFake / estimate.total) * 100 : 0;
  const realPct = 100 - fakePct;

  const confidenceConfig = {
    high: { label: 'Độ tin cậy cao', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    medium: { label: 'Độ tin cậy trung bình', color: 'text-amber-600', bg: 'bg-amber-100' },
    low: { label: 'Độ tin cậy thấp', color: 'text-gray-500', bg: 'bg-gray-100' },
  };
  const conf = confidenceConfig[estimate.confidence];

  const categories = [
    { key: 'buff', label: 'Buff tương tác', count: estimate.buff, icon: <Zap className="h-4 w-4" />, color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200' },
    { key: 'tool', label: 'Tool tự động', count: estimate.tool, icon: <Bot className="h-4 w-4" />, color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200' },
    { key: 'hack', label: 'Hack / Scam', count: estimate.hack, icon: <Terminal className="h-4 w-4" />, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' },
    { key: 'real', label: 'Tài khoản thật', count: estimate.real, icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  ];

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h4 className="text-base font-bold text-gray-900">Ước lượng tài khoản ảo</h4>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full ${conf.bg} px-3 py-1 text-xs font-semibold ${conf.color}`}>
          {conf.label}
        </span>
      </div>

      {/* Big number */}
      <div className="mb-4 flex items-end gap-3">
        <div>
          <p className="text-3xl font-bold text-red-600">
            {estimate.totalFake.toLocaleString('vi-VN')}
          </p>
          <p className="text-xs text-gray-500">tài khoản ảo / {estimate.total.toLocaleString('vi-VN')} tổng tương tác</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold text-emerald-600">{fakePct.toFixed(0)}%</p>
          <p className="text-xs text-gray-500">tỷ lệ ảo</p>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-gray-100">
        {fakePct > 0 && (
          <div className="h-full bg-gradient-to-r from-red-500 to-orange-500" style={{ width: `${fakePct}%` }} />
        )}
        {realPct > 0 && (
          <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400" style={{ width: `${realPct}%` }} />
        )}
      </div>

      {/* Per-type breakdown */}
      <div className="mb-4 space-y-3">
        <TypeBreakdownRow
          icon={<ThumbsUp className="h-4 w-4 text-blue-600" />}
          label="React ảo"
          fakeCount={estimate.fakeReactions}
          realCount={estimate.realReactions}
          total={estimate.fakeReactions + estimate.realReactions}
          fakeColor="bg-blue-500"
          realColor="bg-blue-200"
        />
        <TypeBreakdownRow
          icon={<MessageSquare className="h-4 w-4 text-green-600" />}
          label="Comment ảo"
          fakeCount={estimate.fakeComments}
          realCount={estimate.realComments}
          total={estimate.fakeComments + estimate.realComments}
          fakeColor="bg-green-500"
          realColor="bg-green-200"
        />
        <TypeBreakdownRow
          icon={<Share2 className="h-4 w-4 text-purple-600" />}
          label="Share ảo"
          fakeCount={estimate.fakeShares}
          realCount={estimate.realShares}
          total={estimate.fakeShares + estimate.realShares}
          fakeColor="bg-purple-500"
          realColor="bg-purple-200"
        />
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.map((cat) => {
          if (cat.count === 0) return null;
          const pct = estimate.total > 0 ? (cat.count / estimate.total) * 100 : 0;
          return (
            <div key={cat.key} className={`rounded-lg border ${cat.border} ${cat.bg} p-3 text-center`}>
              <div className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full ${cat.bg} ${cat.color}`}>
                {cat.icon}
              </div>
              <p className={`text-lg font-bold ${cat.color}`}>{cat.count.toLocaleString('vi-VN')}</p>
              <p className="text-xs font-medium text-gray-600">{cat.label}</p>
              <p className="text-xs text-gray-400">{pct.toFixed(0)}%</p>
            </div>
          );
        })}
      </div>

      {/* Method explanation */}
      <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2">
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="font-semibold">Cách tính: </span>{estimate.method}
        </p>
      </div>
    </div>
  );
}

function TypeBreakdownRow({
  icon,
  label,
  fakeCount,
  realCount,
  total,
  fakeColor,
  realColor,
}: {
  icon: React.ReactNode;
  label: string;
  fakeCount: number;
  realCount: number;
  total: number;
  fakeColor: string;
  realColor: string;
}) {
  const fakePct = total > 0 ? (fakeCount / total) * 100 : 0;
  const realPct = 100 - fakePct;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-gray-900">{label}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-red-600">{fakeCount.toLocaleString('vi-VN')} ảo</span>
          <span className="text-gray-300">/</span>
          <span className="font-medium text-emerald-600">{realCount.toLocaleString('vi-VN')} thật</span>
        </div>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
        {fakePct > 0 && (
          <div className={`h-full ${fakeColor}`} style={{ width: `${fakePct}%` }} />
        )}
        {realPct > 0 && (
          <div className={`h-full ${realColor}`} style={{ width: `${realPct}%` }} />
        )}
      </div>
      <p className="mt-1 text-xs text-gray-400">
        {fakePct.toFixed(0)}% ảo · {realPct.toFixed(0)}% thật
      </p>
    </div>
  );
}

function VoteScoreCard({ voteScore }: { voteScore: VoteScore }) {
  const voteRows = [
    {
      icon: <ThumbsUp className="h-4 w-4 text-blue-600" />,
      label: 'React thật',
      count: voteScore.realReactions,
      multiplier: 'x1',
      votes: voteScore.reactVotes,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
    {
      icon: <MessageSquare className="h-4 w-4 text-green-600" />,
      label: 'Cmt khen (x2) + Cmt thường (x1)',
      count: voteScore.realComments,
      multiplier: 'x1-2',
      votes: voteScore.commentVotes,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
    },
    {
      icon: <Share2 className="h-4 w-4 text-purple-600" />,
      label: 'Share thật',
      count: voteScore.realShares,
      multiplier: 'x5',
      votes: voteScore.shareVotes,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
    },
  ];

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-600" />
          <h4 className="text-base font-bold text-gray-900">Điểm Vote thực tế</h4>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
          Sau khi trừ tài khoản ảo
        </span>
      </div>

      {/* Big vote number */}
      <div className="mb-5 flex items-end gap-4">
        <div>
          <p className="text-4xl font-bold text-amber-600">
            {voteScore.totalVotes.toLocaleString('vi-VN')}
          </p>
          <p className="text-xs text-gray-500">tổng vote thực tế</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-lg font-bold text-gray-400 line-through">
            {(
              (voteScore.realReactions + voteScore.fakeReactions) * 1 +
              (voteScore.realComments + voteScore.fakeComments) * 1.5 +
              (voteScore.realShares + voteScore.fakeShares) * 5
            ).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-400">điểm trước khi lọc</p>
        </div>
      </div>

      {/* Per-type vote breakdown */}
      <div className="mb-4 space-y-2">
        {voteRows.map((row, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-lg border ${row.border} ${row.bg} px-4 py-3`}>
            {row.icon}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{row.label}</p>
              <p className="text-xs text-gray-500">
                {row.count.toLocaleString('vi-VN')} lượt thật · hệ số {row.multiplier}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${row.color}`}>{row.votes.toLocaleString('vi-VN')}</p>
              <p className="text-xs text-gray-400">vote</p>
            </div>
          </div>
        ))}
      </div>

      {/* Deducted summary */}
      <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
        <span className="text-xs font-semibold text-red-700">
          Đã trừ {voteScore.deductedAccounts.toLocaleString('vi-VN')} tương tác ảo
        </span>
        <span className="text-xs text-red-400">
          (react {voteScore.fakeReactions.toLocaleString('vi-VN')} · cmt {voteScore.fakeComments.toLocaleString('vi-VN')} · share {voteScore.fakeShares.toLocaleString('vi-VN')})
        </span>
      </div>

      {/* Formula */}
      <div className="rounded-lg bg-gray-50 px-3 py-2">
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="font-semibold">Công thức: </span>{voteScore.formula}
        </p>
      </div>
    </div>
  );
}
