import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/** Sem as duas variáveis o app mostra a tela de configuração em vez de rodar. */
export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabase = createClient<Database>(
  isSupabaseConfigured ? supabaseUrl : 'http://localhost',
  isSupabaseConfigured ? supabaseAnonKey : 'missing-anon-key',
  {
    auth: { persistSession: isSupabaseConfigured, autoRefreshToken: isSupabaseConfigured },
    global: { headers: { 'x-client-info': 'taskplanner-web' } },
  },
);
