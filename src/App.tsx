import { useAuth, AuthProvider } from '@/lib/auth';
import { Dashboard } from '@/components/Dashboard';
import { AdminDashboard } from '@/components/AdminDashboard';
import { UserAuth } from '@/components/UserAuth';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  // Not logged in — single login gate for everyone
  if (!user) {
    return <UserAuth />;
  }

  // Logged in but profile not loaded yet
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-500" />
          <p className="mt-3 text-sm text-gray-500">Đang tải thông tin tài khoản...</p>
        </div>
      </div>
    );
  }

  // Auto-redirect by role: admin → admin dashboard, user → user dashboard
  if (profile.is_admin) {
    return <AdminDashboard />;
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
