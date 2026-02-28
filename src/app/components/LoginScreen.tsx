import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LogIn, Mail, Lock, UserPlus, Loader2, ListTodo, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LoginScreenProps {
  previewMode?: boolean;
  onLoginSuccess?: () => void;
}

export function LoginScreen({ previewMode = false, onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Ref para evitar múltiplas verificações de sessão
  const hasCalledOnLoginSuccess = useRef(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (previewMode) {
      toast.info('Modo preview - configure o Supabase para autenticação real');
      return;
    }
    
    setLoading(true);
    hasCalledOnLoginSuccess.current = false;

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });
        
        if (error) throw error;
        
        if (data?.user?.identities?.length === 0) {
          toast.error('Este email já está cadastrado. Tente fazer login.');
        } else if (data?.user && !data?.session) {
          toast.success('✅ Conta criada! Verifique seu email para confirmar.', {
            duration: 6000,
          });
        } else {
          toast.success('✅ Conta criada e autenticado com sucesso!');
          // Callback paranotificar sucesso
          if (onLoginSuccess && !hasCalledOnLoginSuccess.current) {
            hasCalledOnLoginSuccess.current = true;
            onLoginSuccess();
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast.success('✅ Login realizado com sucesso!');
        // Callback para notificar sucesso
        if (onLoginSuccess && !hasCalledOnLoginSuccess.current) {
          hasCalledOnLoginSuccess.current = true;
          onLoginSuccess();
        }
      }
    } catch (error: any) {
      let errorMessage = error.message || 'Erro ao autenticar';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Email ou senha incorretos';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.';
      } else if (error.message?.includes('User already registered')) {
        errorMessage = 'Este email já está cadastrado. Tente fazer login.';
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = 'A senha deve ter pelo menos 6 caracteres';
      } else if (error.status === 429 || error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        errorMessage = '⏱️ Muitas tentativas. Aguarde 5-10 minutos e tente novamente.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = '⏱️ Limite de requisições atingido. Aguarde alguns minutos.';
      }
      
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (previewMode) {
      toast.info('Modo preview - configure o Supabase para autenticação real');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login com Google');
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Digite seu email primeiro');
      return;
    }

    if (previewMode) {
      toast.info('Modo preview - configure o Supabase para autenticação real');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success('✅ Email de recuperação enviado! Verifique sua caixa de entrada.', {
        duration: 6000,
      });
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar email de recuperação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950 flex items-center justify-center p-4">
      {previewMode && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-4 py-2 rounded-xl font-black text-sm shadow-xl z-50 flex items-center gap-2">
          <AlertCircle size={18} />
          MODO PREVIEW - Esta é apenas uma visualização
          <a href="/" className="ml-2 underline hover:text-purple-100">
            Voltar ao App
          </a>
        </div>
      )}
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-xl">
            <ListTodo size={32} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
            Planner
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Organize suas tarefas com inteligência
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-gray-800">
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 px-4 rounded-xl font-black text-sm transition-all ${
                !isSignUp
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-600'
              }`}
            >
              ENTRAR
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 px-4 rounded-xl font-black text-sm transition-all ${
                isSignUp
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-600'
              }`}
            >
              CRIAR CONTA
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest font-black text-gray-400 mb-2 block px-1">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-950 outline-none rounded-2xl pl-12 pr-4 py-3 text-base font-bold text-gray-700 dark:text-gray-200 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest font-black text-gray-400 mb-2 block px-1">
                Senha
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-950 outline-none rounded-2xl pl-12 pr-4 py-3 text-base font-bold text-gray-700 dark:text-gray-200 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
              </div>
              {isSignUp && (
                <p className="text-xs text-gray-400 mt-1 px-1">Mínimo 6 caracteres</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {isSignUp ? 'CRIANDO CONTA...' : 'ENTRANDO...'}
                </>
              ) : (
                <>
                  {isSignUp ? (
                    <>
                      <UserPlus size={20} strokeWidth={3} />
                      CRIAR CONTA
                    </>
                  ) : (
                    <>
                      <LogIn size={20} strokeWidth={3} />
                      ENTRAR
                    </>
                  )}
                </>
              )}
            </button>
            
            {!isSignUp && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-700 font-bold transition-colors disabled:opacity-50"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-900 px-2 text-gray-400 font-black tracking-widest">
                OU
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-black py-3 rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            CONTINUAR COM GOOGLE
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Ao continuar, você concorda com nossos Termos de Uso
        </p>
      </div>
    </div>
  );
}
