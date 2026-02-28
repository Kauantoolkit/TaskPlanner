/**
 * Services - Repositories
 * 
 * A aplicação usa SupabaseRepository quando Supabase está configurado.
 * Em modo local (sem Supabase), os dados são salvos diretamente no localStorage
 * através dos hooks e contextos.
 * 
 * Não é necessário importar nada deste arquivo.
 */

import { SupabaseRepository } from './SupabaseRepository';
import type { IDataRepository } from './types';

// Singleton instance - use this throughout the app
export const dataRepository: IDataRepository = new SupabaseRepository();

export { SupabaseRepository } from './SupabaseRepository';
export type { IDataRepository } from './types';
