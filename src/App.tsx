import { useAuth, AuthProvider } from '@/lib/auth';
import { Dashboard } from '@/components/Dashboard';
import { AdminAuth } from '@/components/AdminAuth';
import { AdminDashboard } from '@/components/AdminDashboard';
import { UserAuth } from '@/components/UserAuth';
import { Loader2, ShieldCheck } from 'lucide-react';

function AppContent() {
  const { user, profile, loading } = useAuth();

  // Check URL hash for admin route
  const isAdminRoute = typeof window !== 'undefined' && window.location.hash === '#admin';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  // Admin route
  if (isAdminRoute) {
    if (!user) {
      return <AdminAuth />;
    }
    if (user && profile && profile.is_approved && profile.is_admin) {
      return <AdminDashboard />;
    }
    if (user && profile && profile.is_approved && !profile.is_admin) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 px-4">
          <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/20">
              <ShieldCheck className="h-8 w-8 text-blue-400" />
            </div>
            <h1 className="text-lg font-bold text-white">Không có quyền quản trị</h1>
            <p className="mt-2 text-sm text-blue-200 leading-relaxed">
              Tài khoản của bạn không có quyền truy cập trang quản trị.
            </p>
            <button
              onClick={() => window.location.hash = ''}
              className="mt-6 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      );
    }
    // User exists but profile not loaded yet — show loading
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-400" />
          <p className="mt-3 text-sm text-blue-200">Đang tải thông tin tài khoản...</p>
        </div>
      </div>
    );
  }

  // Main route — require login
  if (!user) {
    return <UserAuth />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
