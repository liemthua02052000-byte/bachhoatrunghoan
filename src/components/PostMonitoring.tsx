import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  addMonitoredPost,
  getMonitoredPosts,
  deleteMonitoredPost,
  toggleMonitorStatus,
  getSnapshots,
  updateMonitoredPostMetrics,
  type MonitoredPost,
  type MonitorSnapshot,
} from '@/lib/monitor-service';
import {
  Plus,
  Trash2,
  Pause,
  Play,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Loader2,
  Link2,
  ThumbsUp,
  MessageSquare,
  Share2,
  Clock,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export function PostMonitoring() {
  const [posts, setPosts] = useState<MonitoredPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<MonitorSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Add form state
  const [postUrl, setPostUrl] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postDate, setPostDate] = useState('');
  const [reactions, setReactions] = useState('');
  const [comments, setComments] = useState('');
  const [shares, setShares] = useState('');
  const [formError, setFormError] = useState('');
  const [adding, setAdding] = useState(false);

  // Update form state (inline)
  const [updateReactions, setUpdateReactions] = useState('');
  const [updateComments, setUpdateComments] = useState('');
  const [updateShares, setUpdateShares] = useState('');
  const [showUpdateForm, setShowUpdateForm] = useState<string | null>(null);

  async function loadPosts() {
    setLoading(true);
    const data = await getMonitoredPosts();
    setPosts(data);
    setLoading(false);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('monitor-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'monitored_posts' },
        () => loadPosts()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'monitored_posts' },
        () => loadPosts()
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'monitored_posts' },
        () => loadPosts()
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'monitor_snapshots' },
        (payload) => {
          const newSnap = payload.new as MonitorSnapshot;
          if (expandedPost === newSnap.monitored_post_id) {
            setSnapshots((prev) => [newSnap, ...prev]);
          }
        }
      )
      .subscribe();

    realtimeChannel.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [expandedPost]);

  async function handleAddPost(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!postUrl.trim()) {
      setFormError('Vui lòng nhập link bài viết.');
      return;
    }
    const r = parseInt(reactions) || 0;
    const c = parseInt(comments) || 0;
    const s = parseInt(shares) || 0;

    setAdding(true);
    const result = await addMonitoredPost({
      postUrl: postUrl.trim(),
      postContent: postContent.trim() || undefined,
      postDate: postDate.trim() || undefined,
      totalReactions: r,
      totalComments: c,
      totalShares: s,
    });

    if (!result) {
      setFormError('Không thể thêm bài viết. Vui lòng thử lại.');
      setAdding(false);
      return;
    }

    // Reset form
    setPostUrl('');
    setPostContent('');
    setPostDate('');
    setReactions('');
    setComments('');
    setShares('');
    setShowAddForm(false);
    setAdding(false);
    await loadPosts();
  }

  async function handleToggleStatus(post: MonitoredPost) {
    await toggleMonitorStatus(post.id, post.status);
    await loadPosts();
  }

  async function handleDelete(id: string) {
    await deleteMonitoredPost(id);
    if (expandedPost === id) setExpandedPost(null);
    await loadPosts();
  }

  async function handleExpand(post: MonitoredPost) {
    if (expandedPost === post.id) {
      setExpandedPost(null);
      return;
    }
    setExpandedPost(post.id);
    setLoadingSnapshots(true);
    const snaps = await getSnapshots(post.id, 50);
    setSnapshots(snaps);
    setLoadingSnapshots(false);
  }

  async function handleUpdateMetrics(post: MonitoredPost, e: React.FormEvent) {
    e.preventDefault();
    setUpdatingId(post.id);
    const r = parseInt(updateReactions);
    const c = parseInt(updateComments);
    const s = parseInt(updateShares);
    if (isNaN(r) || isNaN(c) || isNaN(s) || r < 0 || c < 0 || s < 0) {
      setUpdatingId(null);
      return;
    }

    await updateMonitoredPostMetrics(post.id, post, {
      totalReactions: r,
      totalComments: c,
      totalShares: s,
    });

    // Reload snapshots and posts
    const snaps = await getSnapshots(post.id, 50);
    setSnapshots(snaps);
    await loadPosts();
    setShowUpdateForm(null);
    setUpdateReactions('');
    setUpdateComments('');
    setUpdateShares('');
    setUpdatingId(null);
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return d.toLocaleString('vi-VN');
  };

  const formatFullTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const deltaBadge = (delta: number, icon: React.ReactNode) => {
    if (delta === 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
          <Minus className="h-3 w-3" /> 0
        </span>
      );
    }
    if (delta > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
          <TrendingUp className="h-3 w-3" /> +{delta}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600">
        <TrendingDown className="h-3 w-3" /> {delta}
      </span>
    );
  };

  const riskBadge = (level: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      low: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Thấp' },
      medium: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'TB' },
      high: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Cao' },
      critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Nghiêm trọng' },
    };
    const c = config[level] ?? config.low;
    return (
      <span className={`inline-flex items-center rounded-full ${c.bg} ${c.text} px-2 py-0.5 text-xs font-semibold`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Theo dõi biến động bài viết</h3>
          <p className="text-xs text-gray-500">Nhập link bài viết và thông tin để hệ thống theo dõi biến động react, comment, share theo thời gian thực.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showAddForm ? 'Đóng' : 'Thêm bài viết'}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={handleAddPost} className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Link bài viết Facebook *</label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  required
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Nội dung bài viết (tóm tắt)</label>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Dán nội dung hoặc tóm tắt bài viết..."
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Ngày đăng</label>
              <input
                type="text"
                value={postDate}
                onChange={(e) => setPostDate(e.target.value)}
                placeholder="VD: 18/09/2026"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> React</label>
                <input
                  type="number"
                  min={0}
                  value={reactions}
                  onChange={(e) => setReactions(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Cmt</label>
                <input
                  type="number"
                  min={0}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 flex items-center gap-1"><Share2 className="h-3 w-3" /> Share</label>
                <input
                  type="number"
                  min={0}
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={adding}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Bắt đầu theo dõi
          </button>
        </form>
      )}

      {/* Realtime indicator */}
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </span>
        <span className="text-xs font-medium text-emerald-700">Đang theo dõi thời gian thực — biến động mới tự cập nhật</span>
      </div>

      {/* Posts list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-gray-500">Đang tải...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
          <Activity className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-400">Chưa có bài viết nào được theo dõi.</p>
          <p className="text-xs text-gray-400">Bấm "Thêm bài viết" để bắt đầu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {/* Post header */}
              <div
                className="flex cursor-pointer items-start gap-2.5 px-4 py-3 hover:bg-gray-50/50 transition-colors sm:items-center sm:gap-3"
                onClick={() => handleExpand(post)}
              >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                  post.status === 'active' ? 'bg-emerald-100' : 'bg-gray-100'
                }`}>
                  {post.status === 'active' ? (
                    <Activity className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Pause className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {post.post_content || post.post_url}
                  </p>
                  <p className="truncate text-xs text-gray-400">{post.post_url}</p>
                  {/* Mobile metrics */}
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 sm:hidden">
                    <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3 text-blue-500" />{post.current_reactions.toLocaleString('vi-VN')}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3 text-green-500" />{post.current_comments.toLocaleString('vi-VN')}</span>
                    <span className="flex items-center gap-1"><Share2 className="h-3 w-3 text-purple-500" />{post.current_shares.toLocaleString('vi-VN')}</span>
                  </div>
                </div>
                {/* Current metrics - desktop only */}
                <div className="hidden sm:flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 text-gray-600">
                    <ThumbsUp className="h-3.5 w-3.5 text-blue-500" />
                    {post.current_reactions.toLocaleString('vi-VN')}
                  </span>
                  <span className="flex items-center gap-1 text-gray-600">
                    <MessageSquare className="h-3.5 w-3.5 text-green-500" />
                    {post.current_comments.toLocaleString('vi-VN')}
                  </span>
                  <span className="flex items-center gap-1 text-gray-600">
                    <Share2 className="h-3.5 w-3.5 text-purple-500" />
                    {post.current_shares.toLocaleString('vi-VN')}
                  </span>
                </div>
                <span className="hidden sm:block text-xs text-gray-400 whitespace-nowrap">{formatTime(post.last_checked_at)}</span>
                {expandedPost === post.id ? (
                  <ChevronUp className="h-4 w-4 flex-shrink-0 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
                )}
              </div>

              {/* Expanded detail */}
              {expandedPost === post.id && (
                <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4">
                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(post)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        post.status === 'active'
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}
                    >
                      {post.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      {post.status === 'active' ? 'Tạm dừng' : 'Tiếp tục'}
                    </button>
                    <button
                      onClick={() => {
                        setShowUpdateForm(showUpdateForm === post.id ? null : post.id);
                        setUpdateReactions(String(post.current_reactions));
                        setUpdateComments(String(post.current_comments));
                        setUpdateShares(String(post.current_shares));
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200 transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Cập nhật số liệu
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Xóa
                    </button>
                  </div>

                  {/* Update form */}
                  {showUpdateForm === post.id && (
                    <form
                      onSubmit={(e) => handleUpdateMetrics(post, e)}
                      className="rounded-lg border border-blue-200 bg-blue-50/50 p-3"
                    >
                      <p className="mb-2 text-xs font-medium text-gray-600">Nhập số liệu mới (bắt buộc đủ 3 trường) để ghi nhận biến động:</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="mb-0.5 block text-xs text-gray-500 flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> React *</label>
                          <input
                            type="number"
                            min={0}
                            required
                            value={updateReactions}
                            onChange={(e) => setUpdateReactions(e.target.value)}
                            placeholder="Bắt buộc"
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs text-gray-500 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Cmt *</label>
                          <input
                            type="number"
                            min={0}
                            required
                            value={updateComments}
                            onChange={(e) => setUpdateComments(e.target.value)}
                            placeholder="Bắt buộc"
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs text-gray-500 flex items-center gap-1"><Share2 className="h-3 w-3" /> Share *</label>
                          <input
                            type="number"
                            min={0}
                            required
                            value={updateShares}
                            onChange={(e) => setUpdateShares(e.target.value)}
                            placeholder="Bắt buộc"
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={updatingId === post.id}
                        className="mt-2 flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {updatingId === post.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Ghi nhận biến động
                      </button>
                    </form>
                  )}

                  {/* Snapshots table */}
                  <div>
                    <h4 className="mb-2 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Lịch sử biến động
                    </h4>
                    {loadingSnapshots ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      </div>
                    ) : snapshots.length === 0 ? (
                      <p className="py-4 text-center text-xs text-gray-400">Chưa có bản ghi biến động nào.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-xs min-w-[640px]">
                          <thead className="bg-gray-100 text-gray-500">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">Thời gian</th>
                              <th className="px-3 py-2 text-center font-medium">React</th>
                              <th className="px-3 py-2 text-center font-medium">Δ React</th>
                              <th className="px-3 py-2 text-center font-medium">Cmt</th>
                              <th className="px-3 py-2 text-center font-medium">Δ Cmt</th>
                              <th className="px-3 py-2 text-center font-medium">Share</th>
                              <th className="px-3 py-2 text-center font-medium">Δ Share</th>
                              <th className="px-3 py-2 text-center font-medium">Rủi ro</th>
                              <th className="px-3 py-2 text-center font-medium">Điểm</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {snapshots.map((snap) => (
                              <tr key={snap.id} className="hover:bg-gray-50/50">
                                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                  <div>{formatTime(snap.created_at)}</div>
                                  <div className="text-[10px] text-gray-400">{formatFullTime(snap.created_at)}</div>
                                </td>
                                <td className="px-3 py-2 text-center text-gray-700">{snap.snapshot_reactions.toLocaleString('vi-VN')}</td>
                                <td className="px-3 py-2 text-center">{deltaBadge(snap.delta_reactions, <ThumbsUp className="h-3 w-3" />)}</td>
                                <td className="px-3 py-2 text-center text-gray-700">{snap.snapshot_comments.toLocaleString('vi-VN')}</td>
                                <td className="px-3 py-2 text-center">{deltaBadge(snap.delta_comments, <MessageSquare className="h-3 w-3" />)}</td>
                                <td className="px-3 py-2 text-center text-gray-700">{snap.snapshot_shares.toLocaleString('vi-VN')}</td>
                                <td className="px-3 py-2 text-center">{deltaBadge(snap.delta_shares, <Share2 className="h-3 w-3" />)}</td>
                                <td className="px-3 py-2 text-center">{riskBadge(snap.risk_level)}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`font-bold ${
                                    snap.risk_score >= 75 ? 'text-red-600' : snap.risk_score >= 50 ? 'text-orange-600' : snap.risk_score >= 25 ? 'text-amber-600' : 'text-emerald-600'
                                  }`}>
                                    {snap.risk_score}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Sparkline chart */}
                  {snapshots.length > 1 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" /> Biểu đồ biến động
                      </h4>
                      <SparklineChart snapshots={snapshots} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SparklineChart({ snapshots }: { snapshots: MonitorSnapshot[] }) {
  const reversed = [...snapshots].reverse();
  const maxR = Math.max(...reversed.map((s) => s.snapshot_reactions), 1);
  const maxC = Math.max(...reversed.map((s) => s.snapshot_comments), 1);
  const maxS = Math.max(...reversed.map((s) => s.snapshot_shares), 1);

  const points = (key: 'snapshot_reactions' | 'snapshot_comments' | 'snapshot_shares', max: number) => {
    const w = 100;
    const h = 40;
    const step = reversed.length > 1 ? w / (reversed.length - 1) : 0;
    return reversed.map((s, i) => {
      const x = i * step;
      const y = h - (s[key] / max) * h;
      return `${x},${y}`;
    }).join(' ');
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { key: 'snapshot_reactions' as const, max: maxR, color: '#3b82f6', label: 'React', icon: <ThumbsUp className="h-3 w-3 text-blue-500" /> },
          { key: 'snapshot_comments' as const, max: maxC, color: '#22c55e', label: 'Comment', icon: <MessageSquare className="h-3 w-3 text-green-500" /> },
          { key: 'snapshot_shares' as const, max: maxS, color: '#a855f7', label: 'Share', icon: <Share2 className="h-3 w-3 text-purple-500" /> },
        ].map((series) => (
          <div key={series.key}>
            <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-600">
              {series.icon}
              <span className="font-medium">{series.label}</span>
            </div>
            <svg viewBox="0 0 100 40" className="w-full h-12" preserveAspectRatio="none">
              <polyline
                points={points(series.key, series.max)}
                fill="none"
                stroke={series.color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
