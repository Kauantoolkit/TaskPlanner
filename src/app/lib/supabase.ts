import { createClient } from '@supabase/supabase-js';

// Pegue estas variáveis do dashboard do Supabase:
// Settings -> API -> Project URL e anon/public key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Verificar se Supabase está configurado
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

console.log('🔍 DEBUG SUPABASE:');
console.log('URL:', supabaseUrl ? `✅ ${supabaseUrl.substring(0, 30)}...` : '❌ NÃO CONFIGURADA');
console.log('KEY:', supabaseAnonKey ? `✅ ${supabaseAnonKey.substring(0, 20)}...` : '❌ NÃO CONFIGURADA');
console.log('isSupabaseConfigured:', isSupabaseConfigured);

if (!isSupabaseConfigured) {
  console.log(
    '📝 Supabase não configurado - App rodando no modo LOCAL\n' +
    'Para ativar autenticação, crie o arquivo .env na raiz do projeto com:\n' +
    'VITE_SUPABASE_URL=sua_url_aqui\n' +
    'VITE_SUPABASE_ANON_KEY=sua_chave_aqui\n' +
    'Depois, reinicie o servidor (Ctrl+C e npm run dev)\n' +
    'Leia /AUTENTICACAO_SUPABASE.md para mais detalhes.'
  );
}

// Cliente Supabase (ou dummy se não configurado)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });