import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { CurrentUser } from '../types';

interface AuthState {
  /** true até a sessão salva ser lida na abertura do app */
  loading: boolean;
  user: CurrentUser | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function toCurrentUser(session: Session | null): CurrentUser | null {
  const u = session?.user;
  if (!u) return null;
  const email = u.email ?? '';
  return {
    id: u.id,
    email,
    name: (u.user_metadata?.name as string | undefined) || email.split('@')[0] || 'Usuário',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    // Login, logout e refresh de token chegam aqui; nada de window.location.reload()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const value = useMemo<AuthState>(() => ({
    loading,
    user: toCurrentUser(session),
    signOut: async () => { await supabase.auth.signOut(); },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [loading, userId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}

/** Para componentes que só existem com usuário logado. */
export function useCurrentUser(): CurrentUser {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser usado sem usuário logado');
  return user;
}
