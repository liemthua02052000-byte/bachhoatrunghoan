import { useState, useEffect } from 'react';
import type { ScanReport } from '@/lib/types';
import { getScanHistory, deleteScanReport } from '@/lib/scan-service';
import { useAuth } from '@/lib/auth';
import { RiskBadge, riskConfig } from './RiskBadge';
import { History, Trash2, ExternalLink, ChevronRight } from 'lucide-react';

interface Props {
  refreshKey: number;
  onSelect: (report: ScanReport) => void;
}

export function ScanHistory({ refreshKey, onSelect }: Props) {
  const { user } = useAuth();
  const [history, setHistory] = useState<ScanReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getScanHistory(30, user?.id ?? null).then((data) => {
      if (!cancelled) {
        setHistory(data as ScanReport[]);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, user]);

  async function handleDelete(id: string) {
    await deleteScanReport(id);
    setHistory(history.filter((h) => h.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">Đang tải lịch sử...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <History className="mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500">Chưa có bài viết nào được kiểm tra.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((report) => {
        const c = riskConfig[report.risk_level];
        return (
          <div
            key={report.id}
            className={`group flex items-start gap-3 rounded-xl border ${c.border} ${c.bg} p-4 transition-all hover:shadow-md cursor-pointer overflow-hidden sm:gap-4`}
            onClick={() => onSelect(report)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <RiskBadge score={report.risk_score} level={report.risk_level} size="sm" />
                <span className="text-xs text-gray-400">
                  {new Date(report.created_at).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="truncate text-sm text-gray-700">
                {report.post_content || 'Không có nội dung'}
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-400">
                {report.post_url}
              </p>
              <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                <span>{report.total_reactions.toLocaleString('vi-VN')} react</span>
                <span>{report.total_comments.toLocaleString('vi-VN')} cmt</span>
                <span>{report.total_shares.toLocaleString('vi-VN')} share</span>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
              <a
                href={report.post_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-gray-400 hover:text-blue-600 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(report.id);
                }}
                className="text-gray-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <ChevronRight className="h-5 w-5 text-gray-300 hidden sm:block" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
