import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LoginScreen } from './LoginScreen';
import { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Preview mode para visualizar tela de login
  const isPreviewMode = new URLSearchParams(window.location.search).get('preview-login') === 'true';

  console.log('🔐 AuthProvider - isSupabaseConfigured:', isSupabaseConfigured);
  console.log('🔐 AuthProvider - user:', user ? `✅ ${user.email}` : '❌ Não autenticado');
  console.log('🔐 AuthProvider - loading:', loading);

  useEffect(() => {
    // Se Supabase não está configurado, pular autenticação
    if (!isSupabaseConfigured) {
      setLoading(false);
      setUser(null);
      return;
    }

    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Tela de loading inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-bold">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se Supabase não está configurado, mostra app direto (modo local)
  // EXCETO se estiver em modo preview
  if (!isSupabaseConfigured) {
    if (isPreviewMode) {
      return <LoginScreen previewMode={true} />;
    }
    return <>{children}</>;
  }

  // Se não está autenticado, mostra tela de login
  if (!user) {
    return <LoginScreen />;
  }

  // Se está autenticado, mostra a aplicação
  return <>{children}</>;
}