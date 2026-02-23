/**
 * Services - Repositories
 * 
 * A aplicação usa SupabaseRepository quando Supabase está configurado.
 * Em modo local (sem Supabase), os dados são salvos diretamente no localStorage
 * através dos hooks e contextos.
 * 
 * Não é necessário importar nada deste arquivo.
 */

export { SupabaseRepository } from './SupabaseRepository';
export type { IDataRepository } from './types';
