import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ShieldCheck, Loader2, Mail, Lock, UserPlus, LogIn } from 'lucide-react';

export function AdminAuth() {
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      setLoading(false);
      return;
    }

    if (mode === 'signup') {
      const { error: err } = await signUp(email.trim(), password);
      if (err) {
        setError(err);
      } else {
        setInfo('Đăng ký thành công! Tài khoản đầu tiên tự động trở thành quản trị viên. Các tài khoản sau cần được duyệt.');
      }
    } else {
      const { error: err } = await signIn(email.trim(), password);
      if (err) {
        setError(err);
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/30">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">FB Scan Admin</h1>
          <p className="mt-1 text-sm text-blue-200">Bảng điều khiển quản trị viên</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          {/* Tab toggle */}
          <div className="mb-6 flex gap-1 rounded-xl bg-white/10 p-1">
            <button
              onClick={() => { setMode('login'); setError(''); setInfo(''); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                mode === 'login' ? 'bg-white text-slate-900 shadow' : 'text-blue-100 hover:text-white'
              }`}
            >
              <LogIn className="h-4 w-4" /> Đăng nhập
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); setInfo(''); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                mode === 'signup' ? 'bg-white text-slate-900 shadow' : 'text-blue-100 hover:text-white'
              }`}
            >
              <UserPlus className="h-4 w-4" /> Đăng ký
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-blue-100">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full rounded-lg border border-white/15 bg-white/5 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-blue-300/50 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-blue-100">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/15 bg-white/5 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-blue-300/50 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            {info && (
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 leading-relaxed">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === 'login' ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {mode === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-blue-300/70">
            Tài khoản đăng ký đầu tiên tự động trở thành quản trị viên.
            <br />
            Các tài khoản sau cần được admin duyệt.
          </p>
        </div>
      </div>
    </div>
  );
}
