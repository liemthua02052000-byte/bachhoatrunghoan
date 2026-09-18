import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface AdminProfile {
  id: string;
  email: string;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: AdminProfile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(uid: string): Promise<AdminProfile | null> {
    const { data, error } = await supabase
      .rpc('get_my_admin_profile');
    if (error || !data || data.length === 0) {
      setProfile(null);
      return null;
    }
    const p = data[0];
    const profileData: AdminProfile = {
      id: p.id,
      email: p.email,
      is_admin: p.is_admin,
      is_approved: p.is_approved,
      created_at: p.created_at,
    };
    setProfile(profileData);
    return profileData;
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        (async () => {
          await fetchProfile(newSession.user.id);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      // The DB trigger creates the profile row asynchronously.
      // Retry a few times in case the row isn't ready immediately.
      for (let i = 0; i < 5; i++) {
        const p = await fetchProfile(data.user.id);
        if (p) break;
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    return { error: null };
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      for (let i = 0; i < 5; i++) {
        const p = await fetchProfile(data.user.id);
        if (p) break;
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
