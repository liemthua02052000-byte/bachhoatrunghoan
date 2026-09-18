import { useState } from 'react';
import type { ScanInput, InteractionEntry } from '@/lib/types';
import { analyzePost } from '@/lib/analyzer';
import { saveScanReport } from '@/lib/scan-service';
import { ScanResult } from './ScanResult';
import {
  ThumbsUp,
  MessageSquare,
  Share2,
  Link2,
  Plus,
  Trash2,
  Loader2,
  ScanLine,
  HelpCircle,
} from 'lucide-react';

interface Props {
  onSaved: () => void;
}

export function ScanForm({ onSaved }: Props) {
  const [postUrl, setPostUrl] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postDate, setPostDate] = useState('');
  const [totalReactions, setTotalReactions] = useState('');
  const [totalComments, setTotalComments] = useState('');
  const [totalShares, setTotalShares] = useState('');
  const [like, setLike] = useState('');
  const [love, setLove] = useState('');
  const [haha, setHaha] = useState('');
  const [wow, setWow] = useState('');
  const [sad, setSad] = useState('');
  const [angry, setAngry] = useState('');
  const [interactions, setInteractions] = useState<InteractionEntry[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof analyzePost> | null>(null);
  const [error, setError] = useState('');

  function addInteraction() {
    setInteractions([
      ...interactions,
      {
        interactionType: 'comment',
        profileName: '',
        isEmptyProfile: false,
        isNewAccount: false,
        hasProfilePhoto: true,
        content: '',
      },
    ]);
  }

  function updateInteraction(idx: number, field: keyof InteractionEntry, value: string | boolean) {
    setInteractions(
      interactions.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    );
  }

  function removeInteraction(idx: number) {
    setInteractions(interactions.filter((_, i) => i !== idx));
  }

  async function handleAnalyze() {
    setError('');
    setResult(null);

    if (!postUrl.trim()) {
      setError('Vui lòng nhập link bài viết Facebook cần kiểm tra.');
      return;
    }

    setAnalyzing(true);

    const input: ScanInput = {
      postUrl: postUrl.trim(),
      postContent: postContent.trim() || undefined,
      postDate: postDate || undefined,
      totalReactions: parseInt(totalReactions) || 0,
      totalComments: parseInt(totalComments) || 0,
      totalShares: parseInt(totalShares) || 0,
      reactionBreakdown: {
        like: parseInt(like) || 0,
        love: parseInt(love) || 0,
        haha: parseInt(haha) || 0,
        wow: parseInt(wow) || 0,
        sad: parseInt(sad) || 0,
        angry: parseInt(angry) || 0,
      },
      interactions,
    };

    const analysisResult = analyzePost(input);
    setResult(analysisResult);

    await saveScanReport(input, analysisResult);
    onSaved();
    setAnalyzing(false);
  }

  return (
    <div className="space-y-6">
      {/* Post info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Thông tin bài viết</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Link bài viết Facebook <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://www.facebook.com/.../posts/..."
                className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Nội dung bài viết (tóm tắt)</label>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                rows={2}
                placeholder="Dán nội dung hoặc tiêu đề bài viết..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Ngày đăng</label>
              <input
                type="datetime-local"
                value={postDate}
                onChange={(e) => setPostDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Engagement counts */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Số liệu tương tác</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NumberInput
            icon={<ThumbsUp className="h-4 w-4 text-blue-600" />}
            label="Tổng Reactions"
            value={totalReactions}
            onChange={setTotalReactions}
            placeholder="vd: 1200"
          />
          <NumberInput
            icon={<MessageSquare className="h-4 w-4 text-green-600" />}
            label="Tổng Comments"
            value={totalComments}
            onChange={setTotalComments}
            placeholder="vd: 85"
          />
          <NumberInput
            icon={<Share2 className="h-4 w-4 text-purple-600" />}
            label="Tổng Shares"
            value={totalShares}
            onChange={setTotalShares}
            placeholder="vd: 42"
          />
        </div>
      </div>

      {/* Reaction breakdown */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="mb-1 text-base font-semibold text-gray-900">Phân bổ theo loại phản ứng</h3>
        <p className="mb-4 text-xs text-gray-500">Số lượng từng loại react (nếu biết). Để trống nếu không có dữ liệu.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <NumberInput label="Like" value={like} onChange={setLike} placeholder="0" />
          <NumberInput label="Love" value={love} onChange={setLove} placeholder="0" />
          <NumberInput label="Haha" value={haha} onChange={setHaha} placeholder="0" />
          <NumberInput label="Wow" value={wow} onChange={setWow} placeholder="0" />
          <NumberInput label="Sad" value={sad} onChange={setSad} placeholder="0" />
          <NumberInput label="Angry" value={angry} onChange={setAngry} placeholder="0" />
        </div>
      </div>

      {/* Interaction samples */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Mẫu tài khoản tương tác</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Thêm vài tài khoản comment/react để phân tích nick ảo
            </p>
          </div>
          <button
            onClick={addInteraction}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Thêm
          </button>
        </div>

        {interactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Chưa thêm mẫu nào. Nhấn "Thêm" để thêm tài khoản cần kiểm tra.
          </p>
        ) : (
          <div className="space-y-3">
            {interactions.map((it, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <select
                    value={it.interactionType}
                    onChange={(e) => updateInteraction(idx, 'interactionType', e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 focus:border-blue-500 outline-none"
                  >
                    <option value="comment">Comment</option>
                    <option value="react">React</option>
                    <option value="share">Share</option>
                  </select>
                  <button
                    onClick={() => removeInteraction(idx)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={it.profileName}
                    onChange={(e) => updateInteraction(idx, 'profileName', e.target.value)}
                    placeholder="Tên tài khoản"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    value={it.content ?? ''}
                    onChange={(e) => updateInteraction(idx, 'content', e.target.value)}
                    placeholder="Nội dung comment (nếu có)"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={it.isEmptyProfile}
                      onChange={(e) => updateInteraction(idx, 'isEmptyProfile', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
                    />
                    Trang cá nhân trống
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={it.isNewAccount}
                      onChange={(e) => updateInteraction(idx, 'isNewAccount', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
                    />
                    Tài khoản mới tạo
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={!it.hasProfilePhoto}
                      onChange={(e) => updateInteraction(idx, 'hasProfilePhoto', !e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
                    />
                    Không có ảnh đại diện
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={analyzing}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:from-blue-700 hover:to-cyan-700 disabled:opacity-60"
      >
        {analyzing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Đang phân tích...
          </>
        ) : (
          <>
            <ScanLine className="h-5 w-5" /> Phân tích bài viết
          </>
        )}
      </button>

      {result && (
        <ScanResult
          result={result}
          input={{
            totalReactions: parseInt(totalReactions) || 0,
            totalComments: parseInt(totalComments) || 0,
            totalShares: parseInt(totalShares) || 0,
            reactionBreakdown: {
              like: parseInt(like) || 0,
              love: parseInt(love) || 0,
              haha: parseInt(haha) || 0,
              wow: parseInt(wow) || 0,
              sad: parseInt(sad) || 0,
              angry: parseInt(angry) || 0,
            },
            postContent: postContent || undefined,
            postDate: postDate || undefined,
          }}
        />
      )}
    </div>
  );
}

function NumberInput({
  icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>}
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-gray-300 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none ${
            icon ? 'pl-10 pr-3' : 'px-3'
          }`}
        />
      </div>
    </div>
  );
}
