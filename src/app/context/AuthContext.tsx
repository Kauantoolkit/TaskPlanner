import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  checked: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  checked: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setUser(null);
      setChecked(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      setChecked(true);
    }).catch(() => {
      setLoading(false);
      setUser(null);
      setChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Não faz early return - sempre renderiza children
  return (
    <AuthContext.Provider value={{ user, loading, checked }}>
      {children}
    </AuthContext.Provider>
  );
}

// Componente de Loading separado
export function AuthLoading({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { loading, checked, user } = useAuth();
  const isPreviewMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview-login') === 'true';

  // Enquanto verifica auth
  if (!checked) {
    return <>{fallback}</>;
  }

  // Se não configurado
  if (!isSupabaseConfigured) {
    if (isPreviewMode) {
      // Importação dinâmica para evitar ciclo
      return <>{children}</>;
    }
    return <>{children}</>;
  }

  // Se não autenticado
  if (!user) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Hook para verificar se deve mostrar login
export function useMustLogin() {
  const { user, loading, checked } = useAuth();
  const isPreviewMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview-login') === 'true';

  if (!isSupabaseConfigured) {
    return { shouldShowLogin: isPreviewMode, isLoading: false };
  }

  return { 
    shouldShowLogin: checked && !user, 
    isLoading: loading || !checked 
  };
}
