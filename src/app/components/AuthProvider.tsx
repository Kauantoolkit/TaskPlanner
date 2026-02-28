import React, { useEffect, useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LoginScreen } from './LoginScreen';
import { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

interface AuthProviderProps {
  children: React.ReactNode;
}

// Timeout para carregamento (10 segundos)
const AUTH_LOADING_TIMEOUT = 10000;

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Refs para controle de cleanup e timeout
  const isMountedRef = useRef(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Preview mode para visualizar tela de login
  const isPreviewMode = new URLSearchParams(window.location.search).get('preview-login') === 'true';

  // Cleanup ao desmontar
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Função para forçar stop do loading
  const forceStopAuthLoading = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    loadingTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false);
        console.warn('Auth timeout - forçando autenticação');
      }
    }, AUTH_LOADING_TIMEOUT);
  };

  useEffect(() => {
    // Se Supabase não está configurado, pular autenticação
    if (!isSupabaseConfigured) {
      if (isMountedRef.current) {
        setLoading(false);
        setUser(null);
      }
      return;
    }

    // Iniciar timeout de segurança
    forceStopAuthLoading();

    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMountedRef.current) return;
      
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Limpar timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }).catch((err) => {
      console.error('Erro ao verificar sessão:', err);
      if (isMountedRef.current) {
        setLoading(false);
        setUser(null);
      }
    });

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMountedRef.current) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
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
