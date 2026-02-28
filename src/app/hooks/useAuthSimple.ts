import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Hook SIMPLES de autenticação
 * UM ÚNICO ponto de verificação para todo o app
 */
export function useAuthSimple() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Se Supabase não configurado, usa modo local
    if (!isSupabaseConfigured) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Verifica sessão atual
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const session = data?.session ?? null;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escuta mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading, isSupabaseConfigured };
}
