import { useState } from 'react';
import type { ScanReport, ScanResult as ScanResultType, ScanInput } from '@/lib/types';
import { ScanForm } from './ScanForm';
import { ScanHistory } from './ScanHistory';
import { ScanResult } from './ScanResult';
import { RiskBadge } from './RiskBadge';
import { getScanWithInteractions } from '@/lib/scan-service';
import {
  ShieldCheck,
  ScanLine,
  History,
  HelpCircle,
  X,
  Loader2,
} from 'lucide-react';

type Tab = 'scan' | 'history' | 'guide';

export function Dashboard() {
  const [tab, setTab] = useState<Tab>('scan');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedReport, setSelectedReport] = useState<ScanReport | null>(null);
  const [detailResult, setDetailResult] = useState<ScanResultType | null>(null);
  const [detailInput, setDetailInput] = useState<{ totalReactions: number; totalComments: number; totalShares: number; reactionBreakdown: Record<string, number>; postContent?: string; postDate?: string } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  function handleSaved() {
    setRefreshKey((k) => k + 1);
  }

  async function handleSelectReport(report: ScanReport) {
    setSelectedReport(report);
    setDetailResult(null);
    setDetailInput(null);
    setDetailLoading(true);

    const loaded = await getScanWithInteractions(report.id);
    if (loaded) {
      setDetailResult(loaded.result);
      setDetailInput({
        totalReactions: loaded.input.totalReactions,
        totalComments: loaded.input.totalComments,
        totalShares: loaded.input.totalShares,
        reactionBreakdown: loaded.input.reactionBreakdown as Record<string, number>,
        postContent: loaded.input.postContent,
        postDate: loaded.input.postDate,
      });
    }
    setDetailLoading(false);
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'scan', label: 'Kiểm tra bài viết', icon: <ScanLine className="h-4 w-4" /> },
    { id: 'history', label: 'Lịch sử', icon: <History className="h-4 w-4" /> },
    { id: 'guide', label: 'Hướng dẫn', icon: <HelpCircle className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-200">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">FB Scan</h1>
              <p className="text-xs text-gray-500">Phát hiện tương tác ảo trên Facebook</p>
            </div>
          </div>
          <a
            href="https://www.facebook.com/help/1926586941784512"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-xs text-gray-500 hover:text-blue-600 sm:block"
          >
            Chính sách Facebook
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'scan' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
              <h2 className="mb-1 text-base font-semibold text-gray-900">
                Kiểm tra bài viết Facebook có bị buff tương tác không
              </h2>
              <p className="text-sm leading-relaxed text-gray-600">
                Nhập link bài viết và số liệu tương tác. Hệ thống sẽ phân tích các dấu hiệu
                nick ảo, tỷ lệ react/comment bất thường, comment spam và cho điểm rủi ro.
              </p>
            </div>
            <ScanForm onSaved={handleSaved} />
          </div>
        )}

        {tab === 'history' && (
          <div>
            <h2 className="mb-4 text-lg font-bold text-gray-900">Lịch sử kiểm tra</h2>
            <ScanHistory refreshKey={refreshKey} onSelect={handleSelectReport} />
          </div>
        )}

        {tab === 'guide' && <Guide />}

        {/* Report detail modal */}
        {selectedReport && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setSelectedReport(null)}
          >
            <div
              className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Chi tiết báo cáo</h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mb-4">
                <RiskBadge score={selectedReport.risk_score} level={selectedReport.risk_level} size="lg" />
              </div>
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="ml-2 text-sm text-gray-500">Đang tải dữ liệu...</span>
                </div>
              ) : detailResult && detailInput ? (
                <ScanResult
                  result={detailResult}
                  input={detailInput}
                />
              ) : (
                <ScanResult
                  result={{
                    riskScore: selectedReport.risk_score,
                    riskLevel: selectedReport.risk_level,
                    detectedSignals: selectedReport.detected_signals ?? [],
                    engagementRatio: Number(selectedReport.engagement_ratio),
                    suspiciousInteractionCount: 0,
                    totalInteractionCount: 0,
                    flaggedAccounts: [],
                    allAccounts: [],
                    fakeEstimate: {
                      totalFake: 0,
                      buff: 0,
                      tool: 0,
                      hack: 0,
                      real: 0,
                      total: 0,
                      confidence: 'low',
                      method: 'Không có dữ liệu',
                    },
                  }}
                  input={{
                    totalReactions: selectedReport.total_reactions,
                    totalComments: selectedReport.total_comments,
                    totalShares: selectedReport.total_shares,
                    reactionBreakdown: selectedReport.reaction_breakdown ?? {},
                    postContent: selectedReport.post_content ?? undefined,
                    postDate: selectedReport.post_date ?? undefined,
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-gray-200 bg-white/50 py-6">
        <div className="mx-auto max-w-5xl px-4 text-center text-xs text-gray-400">
          Công cụ phân tích độc lập — không liên kết với Facebook. Kết quả mang tính tham khảo.
        </div>
      </footer>
    </div>
  );
}

function Guide() {
  const sections = [
    {
      title: '1. Lấy số liệu từ Facebook',
      steps: [
        'Mở bài viết trên Facebook page của bạn.',
        'Ghi lại tổng số react, comment, share hiển thị dưới bài viết.',
        'Bấm vào "Xem tất cả reactions" để xem phân bổ từng loại (Like, Love, Haha...).',
        'Cuộn qua danh sách comment, để ý các tài khoản có tên lạ, không có ảnh, hoặc trang cá nhân trống.',
      ],
    },
    {
      title: '2. Nhập dữ liệu vào công cụ',
      steps: [
        'Dán link bài viết vào ô đầu tiên.',
        'Nhập tổng số react, comment, share.',
        'Nếu biết phân bổ từng loại react, điền vào các ô tương ứng.',
        'Thêm vài mẫu tài khoản comment để hệ thống kiểm tra nick ảo.',
      ],
    },
    {
      title: '3. Hiểu kết quả phân tích',
      steps: [
        'Điểm rủi ro 0-25: bài viết có vẻ an toàn, tương tác tự nhiên.',
        'Điểm 25-50: có dấu hiệu đáng ngờ, nên theo dõi thêm.',
        'Điểm 50-75: nhiều dấu hiệu buff, cần kiểm tra kỹ.',
        'Điểm 75-100: rất nhiều bằng chứng buff react/comment/share bằng tool.',
      ],
    },
    {
      title: '4. Các dấu hiệu buff phổ biến',
      steps: [
        'Tỷ lệ react/comment quá cao (trên 50:1) — bài thật thường 10-30:1.',
        'Phản ứng gần như 100% là "Like" — bài thật có đa dạng Love, Haha, Wow.',
        'Nhiều tài khoản comment có trang cá nhân trống, không ảnh đại diện.',
        'Comment ngắn, generic ("like", "hay", "nice") lặp lại nhiều lần.',
        'Hàng nghìn react trong thời gian rất ngắn (dưới 1 giờ).',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-lg font-bold text-gray-900">Hướng dẫn sử dụng</h2>
        <p className="text-sm text-gray-500">
          Cách kiểm tra bài viết Facebook có bị buff tương tác bằng tool hay không.
        </p>
      </div>

      {sections.map((s) => (
        <div key={s.title} className="rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="mb-3 text-base font-semibold text-gray-900">{s.title}</h3>
          <ul className="space-y-2">
            {s.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h3 className="mb-2 text-sm font-semibold text-amber-800">Lưu ý quan trọng</h3>
        <p className="text-sm leading-relaxed text-amber-700">
          Công cụ này phân tích dựa trên số liệu bạn nhập vào — kết quả mang tính tham khảo,
          không phải kết luận cuối cùng. Một số bài viết viral thật có thể có tỷ lệ bất thường
          mà không phải buff. Kết hợp nhiều dấu hiệu để đánh giá chính xác nhất.
        </p>
      </div>
    </div>
  );
}
