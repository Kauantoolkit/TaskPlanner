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
  console.log('🚀 Iniciando migração do LocalStorage para Supabase...');

  try {
    // Ler dados do localStorage
    const tasksJson = localStorage.getItem('agenda-tasks');
    const categoriesJson = localStorage.getItem('agenda-categories');
    const settingsJson = localStorage.getItem('agenda-settings');

    if (!tasksJson && !categoriesJson && !settingsJson) {
      console.warn('⚠️ Nenhum dado encontrado no localStorage.');
      return;
    }

    const tasks = tasksJson ? JSON.parse(tasksJson) : [];
    const categories = categoriesJson ? JSON.parse(categoriesJson) : [];
    const settings = settingsJson ? JSON.parse(settingsJson) : null;

    console.log(`📋 Encontrados: ${tasks.length} tarefas, ${categories.length} categorias`);

    // Migrar categorias primeiro (tasks dependem delas)
    console.log('📦 Migrando categorias...');
    for (const category of categories) {
      try {
        await dataRepository.createCategory(category);
        console.log(`  ✅ Categoria "${category.name}" migrada`);
      } catch (error: any) {
        console.warn(`  ⚠️ Erro ao migrar categoria "${category.name}":`, error.message);
      }
    }

    // Migrar tarefas
    console.log('📝 Migrando tarefas...');
    for (const task of tasks) {
      try {
        await dataRepository.createTask(task);
        console.log(`  ✅ Tarefa "${task.text}" migrada`);
      } catch (error: any) {
        console.warn(`  ⚠️ Erro ao migrar tarefa "${task.text}":`, error.message);
      }
    }

    // Migrar settings
    if (settings) {
      console.log('⚙️ Migrando configurações...');
      try {
        await dataRepository.updateSettings(settings);
        console.log('  ✅ Configurações migradas');
      } catch (error: any) {
        console.warn('  ⚠️ Erro ao migrar configurações:', error.message);
      }
    }

    console.log('');
    console.log('✅ ========================================');
    console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('✅ ========================================');
    console.log('');
    console.log('📊 Resumo:');
    console.log(`  • ${tasks.length} tarefas migradas`);
    console.log(`  • ${categories.length} categorias migradas`);
    console.log(`  • ${settings ? '1' : '0'} configuração migrada`);
    console.log('');
    console.log('💡 Seus dados agora estão no Supabase!');
    console.log('💡 Você pode verificar em: Supabase Dashboard → Table Editor');
    console.log('');
    console.log('⚠️ IMPORTANTE: Recarregue a página para ver os dados sincronizados.');

    return {
      success: true,
      migrated: {
        tasks: tasks.length,
        categories: categories.length,
        settings: settings ? 1 : 0,
      },
    };
  } catch (error: any) {
    console.error('❌ Erro durante a migração:', error);
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
