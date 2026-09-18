import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck,
  LogOut,
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  ThumbsUp,
  MessageSquare,
  Share2,
  AlertTriangle,
  Loader2,
  Search,
  Eye,
  X,
} from 'lucide-react';
import type { ScanResult as ScanResultType } from '@/lib/types';
import { ScanResult } from './ScanResult';
import { getScanWithInteractions } from '@/lib/scan-service';
import { PostMonitoring } from './PostMonitoring';

interface ScanRow {
  id: string;
  post_url: string;
  post_content: string | null;
  post_date: string | null;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  reaction_breakdown: Record<string, number>;
  risk_score: number;
  risk_level: string;
  engagement_ratio: number;
  created_at: string;
}

interface PendingUser {
  id: string;
  email: string;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
}

type AdminTab = 'overview' | 'history' | 'monitor' | 'users';

export function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedScan, setSelectedScan] = useState<ScanRow | null>(null);
  const [detailResult, setDetailResult] = useState<ScanResultType | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailInput, setDetailInput] = useState<{ totalReactions: number; totalComments: number; totalShares: number; reactionBreakdown: Record<string, number>; postContent?: string; postDate?: string } | null>(null);
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load scan history
  useEffect(() => {
    async function loadScans() {
      setLoadingScans(true);
      const { data } = await supabase
        .from('scan_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setScans((data ?? []) as ScanRow[]);
      setLoadingScans(false);
    }
    loadScans();
  }, []);

  // Realtime subscription for new scans
  useEffect(() => {
    const channel = supabase
      .channel('admin-scan-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scan_reports' },
        (payload) => {
          const newRow = payload.new as ScanRow;
          setScans((prev) => [newRow, ...prev]);
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'scan_reports' },
        (payload) => {
          setScans((prev) => prev.filter((s) => s.id !== payload.old.id));
        }
      )
      .subscribe();

    realtimeChannel.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load pending users
  async function loadUsers() {
    setLoadingUsers(true);
    const { data } = await supabase
      .from('admin_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setPendingUsers((data ?? []) as PendingUser[]);
    setLoadingUsers(false);
  }

  useEffect(() => {
    if (tab === 'users') loadUsers();
  }, [tab]);

  async function approveUser(id: string) {
    const { error } = await supabase
      .from('admin_profiles')
      .update({ is_approved: true })
      .eq('id', id);
    if (!error) loadUsers();
  }

  async function rejectUser(id: string) {
    const { error } = await supabase
      .from('admin_profiles')
      .update({ is_approved: false })
      .eq('id', id);
    if (!error) loadUsers();
  }

  async function viewScanDetail(scan: ScanRow) {
    setSelectedScan(scan);
    setDetailResult(null);
    setDetailInput(null);
    setDetailLoading(true);

    const loaded = await getScanWithInteractions(scan.id);
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

  // Stats
  const totalScans = scans.length;
  const criticalCount = scans.filter((s) => s.risk_level === 'critical').length;
  const highCount = scans.filter((s) => s.risk_level === 'high').length;
  const avgRisk = totalScans > 0 ? Math.round(scans.reduce((sum, s) => sum + s.risk_score, 0) / totalScans) : 0;
  const totalReactions = scans.reduce((sum, s) => sum + s.total_reactions, 0);
  const totalComments = scans.reduce((sum, s) => sum + s.total_comments, 0);
  const totalShares = scans.reduce((sum, s) => sum + s.total_shares, 0);

  // Filtered scans
  const filteredScans = scans.filter((s) => {
    if (riskFilter !== 'all' && s.risk_level !== riskFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.post_url.toLowerCase().includes(q) ||
        (s.post_content?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const riskBadge = (level: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      low: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Thấp' },
      medium: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Trung bình' },
      high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Cao' },
      critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Nghiêm trọng' },
    };
    const c = config[level] ?? config.low;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full ${c.bg} ${c.text} px-2.5 py-0.5 text-xs font-semibold`}>
        {c.label}
      </span>
    );
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return d.toLocaleString('vi-VN');
  };

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Tổng quan', icon: <Activity className="h-4 w-4" /> },
    { id: 'history', label: 'Lịch sử kiểm tra', icon: <Clock className="h-4 w-4" /> },
    { id: 'monitor', label: 'Theo dõi biến động', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'users', label: 'Tài khoản', icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-200">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">FB Scan Admin</h1>
              <p className="text-xs text-gray-500">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Đăng xuất
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                tab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                icon={<Clock className="h-5 w-5 text-blue-600" />}
                label="Tổng lượt kiểm tra"
                value={totalScans.toLocaleString('vi-VN')}
              />
              <StatCard
                icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
                label="Bài nghiêm trọng"
                value={criticalCount.toLocaleString('vi-VN')}
              />
              <StatCard
                icon={<TrendingUp className="h-5 w-5 text-orange-600" />}
                label="Bài rủi ro cao"
                value={highCount.toLocaleString('vi-VN')}
              />
              <StatCard
                icon={<Activity className="h-5 w-5 text-purple-600" />}
                label="Điểm rủi ro TB"
                value={`${avgRisk}/100`}
              />
            </div>

            {/* Engagement totals */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Tổng React đã quét</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{totalReactions.toLocaleString('vi-VN')}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Tổng Comment đã quét</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{totalComments.toLocaleString('vi-VN')}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Tổng Share đã quét</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{totalShares.toLocaleString('vi-VN')}</p>
              </div>
            </div>

            {/* Recent scans preview */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Lượt kiểm tra gần đây</h3>
                <button
                  onClick={() => setTab('history')}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Xem tất cả →
                </button>
              </div>
              <div className="space-y-2">
                {scans.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5"
                  >
                    {riskBadge(s.risk_level)}
                    <span className="flex-1 truncate text-sm text-gray-700">
                      {s.post_content || s.post_url}
                    </span>
                    <span className="text-xs text-gray-400">{formatTime(s.created_at)}</span>
                  </div>
                ))}
                {scans.length === 0 && (
                  <p className="py-4 text-center text-sm text-gray-400">Chưa có lượt kiểm tra nào.</p>
                )}
              </div>
            </div>

            {/* Realtime indicator */}
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-sm font-medium text-emerald-700">Đang theo dõi thời gian thực — lượt kiểm tra mới sẽ tự động xuất hiện</span>
            </div>
          </div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo link hoặc nội dung bài viết..."
                  className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <div className="flex gap-1.5">
                {['all', 'low', 'medium', 'high', 'critical'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRiskFilter(r)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      riskFilter === r
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {r === 'all' ? 'Tất cả' : r === 'low' ? 'Thấp' : r === 'medium' ? 'TB' : r === 'high' ? 'Cao' : 'Nghiêm trọng'}
                  </button>
                ))}
              </div>
            </div>

            {/* Realtime indicator */}
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="font-medium">Cập nhật thời gian thực</span>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {loadingScans ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <span className="ml-2 text-sm text-gray-500">Đang tải...</span>
                </div>
              ) : filteredScans.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-400">Không có lượt kiểm tra nào.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Mức rủi ro</th>
                        <th className="px-4 py-3 text-left font-medium">Bài viết</th>
                        <th className="px-4 py-3 text-center font-medium">React</th>
                        <th className="px-4 py-3 text-center font-medium">Cmt</th>
                        <th className="px-4 py-3 text-center font-medium">Share</th>
                        <th className="px-4 py-3 text-center font-medium">Điểm</th>
                        <th className="px-4 py-3 text-left font-medium">Thời gian</th>
                        <th className="px-4 py-3 text-center font-medium">Xem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredScans.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">{riskBadge(s.risk_level)}</td>
                          <td className="max-w-xs px-4 py-3">
                            <p className="truncate text-gray-700">{s.post_content || s.post_url}</p>
                            <p className="truncate text-xs text-gray-400">{s.post_url}</p>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{s.total_reactions.toLocaleString('vi-VN')}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{s.total_comments.toLocaleString('vi-VN')}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{s.total_shares.toLocaleString('vi-VN')}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${
                              s.risk_score >= 75 ? 'text-red-600' : s.risk_score >= 50 ? 'text-orange-600' : s.risk_score >= 25 ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                              {s.risk_score}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{formatTime(s.created_at)}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => viewScanDetail(s)}
                              className="inline-flex items-center justify-center rounded-lg bg-blue-50 p-1.5 text-blue-600 hover:bg-blue-100 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400">Hiển thị {filteredScans.length} / {totalScans} lượt kiểm tra</p>
          </div>
        )}

        {/* Monitor tab */}
        {tab === 'monitor' && <PostMonitoring />}

        {/* Users tab */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="mb-1 text-sm font-semibold text-gray-900">Quản lý tài khoản</h3>
              <p className="mb-4 text-xs text-gray-500">Duyệt hoặc từ chối tài khoản đăng ký mới. Tài khoản đầu tiên đã tự động là admin.</p>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                </div>
              ) : pendingUsers.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">Chưa có tài khoản nào.</p>
              ) : (
                <div className="space-y-2">
                  {pendingUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{u.email}</p>
                        <p className="text-xs text-gray-400">Đăng ký: {formatTime(u.created_at)}</p>
                      </div>
                      {u.is_admin && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </span>
                      )}
                      {u.is_approved ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Đã duyệt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          <Clock className="h-3 w-3" /> Chờ duyệt
                        </span>
                      )}
                      {!u.is_admin && (
                        <button
                          onClick={() => u.is_approved ? rejectUser(u.id) : approveUser(u.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            u.is_approved
                              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {u.is_approved ? 'Thu hồi' : 'Duyệt'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedScan && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setSelectedScan(null)}
        >
          <div
            className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Chi tiết lượt kiểm tra</h3>
              <button
                onClick={() => setSelectedScan(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 rounded-lg bg-gray-50 px-4 py-2 text-xs text-gray-500">
              <p className="font-medium text-gray-700">{selectedScan.post_url}</p>
              <p className="mt-0.5">Kiểm tra lúc: {new Date(selectedScan.created_at).toLocaleString('vi-VN')}</p>
            </div>
            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-gray-500">Đang tải...</span>
              </div>
            ) : detailResult && detailInput ? (
              <ScanResult result={detailResult} input={detailInput} />
            ) : (
              <div className="py-8 text-center text-sm text-gray-400">
                Không thể tải chi tiết. Lượt kiểm tra này có thể không còn dữ liệu.
              </div>
            )}
          </div>
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
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
