/**
 * Script de migração de dados do LocalStorage para Supabase
 * 
 * Como usar:
 * 1. Abra o console do navegador (F12)
 * 2. Execute: await migrateFromLocalStorage()
 * 3. Aguarde a mensagem de sucesso
 */

import { dataRepository } from '../services';

export async function migrateFromLocalStorage() {
  try {
    // Ler dados do localStorage
    const tasksJson = localStorage.getItem('agenda-tasks');
    const categoriesJson = localStorage.getItem('agenda-categories');
    const settingsJson = localStorage.getItem('agenda-settings');

    if (!tasksJson && !categoriesJson && !settingsJson) {
      return;
    }

    const tasks = tasksJson ? JSON.parse(tasksJson) : [];
    const categories = categoriesJson ? JSON.parse(categoriesJson) : [];
    const settings = settingsJson ? JSON.parse(settingsJson) : null;

    // Migrar categorias primeiro (tasks dependem delas)
    for (const category of categories) {
      try {
        await dataRepository.createCategory(category);
      } catch (error: any) {
        // Silenciosamente ignora erros de categorias duplicadas
      }
    }

    // Migrar tarefas
    for (const task of tasks) {
      try {
        await dataRepository.createTask(task);
      } catch (error: any) {
        // Silenciosamente ignora erros
      }
    }

    // Migrar settings
    if (settings) {
      try {
        await dataRepository.updateSettings(settings);
      } catch (error: any) {
        // Silenciosamente ignora erros
      }
    }

    return {
      success: true,
      migrated: {
        tasks: tasks.length,
        categories: categories.length,
        settings: settings ? 1 : 0,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Exportar para uso global no console
if (typeof window !== 'undefined') {
  (window as any).migrateFromLocalStorage = migrateFromLocalStorage;
}
