import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, Category, Settings } from '../types';
import { SupabaseRepository } from '../services/SupabaseRepository';

// Variáveis de ambiente diretamente para evitar problemas de importação
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const isSupabaseConfigured = Boolean(supabaseUrl.trim() && supabaseAnonKey.trim());

import { supabase } from '../lib/supabase';

const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Trabalho', color: 'bg-blue-500 text-white' },
  { id: '2', name: 'Pessoal', color: 'bg-emerald-500 text-white' },
  { id: '3', name: 'Saúde', color: 'bg-rose-500 text-white' },
];

const INITIAL_SETTINGS: Settings = {
  darkMode: false,
  showCompleted: true,
  confirmDelete: true,
};

// Singleton do repository para evitar recriação
let repositoryInstance: SupabaseRepository | null = null;

function getRepository(): SupabaseRepository {
  if (!repositoryInstance) {
    repositoryInstance = new SupabaseRepository();
  }
  return repositoryInstance;
}

export function useDataRepository() {
  // Estados sempre na mesma ordem
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSupabaseMode, setIsSupabaseMode] = useState(false);

  // Hooks que não dependem de props (sempre mesmos)
  const repository = useMemo(() => getRepository(), []);

  // Função para carregar dados do localStorage
  const loadFromLocalStorage = useCallback(() => {
    try {
      const localTasks = localStorage.getItem('agenda-tasks');
      const localCategories = localStorage.getItem('agenda-categories');
      const localSettings = localStorage.getItem('agenda-settings');
      
      if (localTasks) setTasks(JSON.parse(localTasks));
      if (localCategories) setCategories(JSON.parse(localCategories));
      if (localSettings) setSettings(JSON.parse(localSettings));
    } catch (e) {
      console.error('[useDataRepository] Erro ao carregar localStorage:', e);
    }
  }, []);

  // Função para salvar no localStorage
  const saveToLocalStorage = useCallback(() => {
    try {
      localStorage.setItem('agenda-tasks', JSON.stringify(tasks));
      localStorage.setItem('agenda-categories', JSON.stringify(categories));
      localStorage.setItem('agenda-settings', JSON.stringify(settings));
    } catch (e) {
      console.error('[useDataRepository] Erro ao salvar localStorage:', e);
    }
  }, [tasks, categories, settings]);

  // Carrega dados uma única vez (useEffect sem deps = executa 1x)
  useEffect(() => {
    let cancelled = false;
    let mounted = true;

    const loadData = async () => {
      // Se não tem Supabase configurado, usa localStorage
      if (!isSupabaseConfigured) {
        loadFromLocalStorage();
        setLoading(false);
        setIsSupabaseMode(false);
        return;
      }

      // Supabase está configurado - verifica sessão
      setIsSupabaseMode(true);

      try {
        // Verifica se existe sessão válida
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Sem sessão - não faz fallback para localStorage
          if (!cancelled && mounted) {
            setError('Sessão expirada. Por favor, faça login novamente.');
            setLoading(false);
          }
          return;
        }

        // Timeout de 8 segundos
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 8000);
        });

        const loadPromise = Promise.all([
          repository.getTasks(),
          repository.getCategories(),
          repository.getSettings(),
        ]);

        const results = await Promise.race([loadPromise, timeoutPromise]);

        if (!cancelled && mounted) {
          const [tasksData, categoriesData, settingsData] = results;
          setTasks(tasksData || []);
          setCategories(categoriesData || INITIAL_CATEGORIES);
          setSettings(settingsData || INITIAL_SETTINGS);
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled && mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
          console.error('[useDataRepository] Erro ao carregar do Supabase:', errorMessage);
          // NÃO faz fallback para localStorage quando Supabase está configurado
          setError(errorMessage);
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []); // SEM DEPENDÊNCIAS - executa uma única vez

  // Salva no localStorage APENAS quando NÃO está em modo Supabase
  useEffect(() => {
    if (!loading && !isSupabaseMode) {
      saveToLocalStorage();
    }
  }, [tasks, categories, settings, loading, isSupabaseMode, saveToLocalStorage]);

  // Callbacks - agora também salvam no Supabase quando apropriado
  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdById' | 'assignedToId' | 'workspaceId'>) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdById: 'local-user',
      assignedToId: '',
      workspaceId: '',
    };

    setTasks(prev => [newTask, ...prev]);

    // Se estiver em modo Supabase, salva no Supabase
    if (isSupabaseMode && !loading) {
      try {
        await repository.createTask(newTask);
      } catch (err) {
        console.error('[useDataRepository] Erro ao criar task no Supabase:', err);
      }
    }
  }, [isSupabaseMode, loading, repository]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    // Se estiver em modo Supabase, atualiza no Supabase
    if (isSupabaseMode && !loading) {
      try {
        await repository.updateTask(id, updates);
      } catch (err) {
        console.error('[useDataRepository] Erro ao atualizar task no Supabase:', err);
      }
    }
  }, [isSupabaseMode, loading, repository]);

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));

    // Se estiver em modo Supabase, deleta do Supabase
    if (isSupabaseMode && !loading) {
      try {
        await repository.deleteTask(id);
      } catch (err) {
        console.error('[useDataRepository] Erro ao deletar task no Supabase:', err);
      }
    }
  }, [isSupabaseMode, loading, repository]);

  const addCategory = useCallback(async (name: string, color: string) => {
    const newCategory: Category = {
      id: crypto.randomUUID(),
      name,
      color,
    };
    setCategories(prev => [...prev, newCategory]);

    // Se estiver em modo Supabase, salva no Supabase
    if (isSupabaseMode && !loading) {
      try {
        await repository.createCategory(newCategory);
      } catch (err) {
        console.error('[useDataRepository] Erro ao criar categoria no Supabase:', err);
      }
    }
  }, [isSupabaseMode, loading, repository]);

  const deleteCategory = useCallback(async (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setTasks(prev => prev.map(t => t.categoryId === id ? { ...t, categoryId: undefined } : t));

    // Se estiver em modo Supabase, deleta do Supabase
    if (isSupabaseMode && !loading) {
      try {
        await repository.deleteCategory(id);
      } catch (err) {
        console.error('[useDataRepository] Erro ao deletar categoria no Supabase:', err);
      }
    }
  }, [isSupabaseMode, loading, repository]);

  const updateSettings = useCallback(async (newSettings: Settings) => {
    setSettings(newSettings);

    // Se estiver em modo Supabase, salva no Supabase
    if (isSupabaseMode && !loading) {
      try {
        await repository.updateSettings(newSettings);
      } catch (err) {
        console.error('[useDataRepository] Erro ao salvar settings no Supabase:', err);
      }
    }
  }, [isSupabaseMode, loading, repository]);

  const clearAll = useCallback(async () => {
    setTasks([]);
    setCategories(INITIAL_CATEGORIES);
    setSettings(INITIAL_SETTINGS);

    // Se estiver em modo Supabase, limpa no Supabase
    if (isSupabaseMode && !loading) {
      try {
        await repository.clearAll();
      } catch (err) {
        console.error('[useDataRepository] Erro ao limpar dados no Supabase:', err);
      }
    }
  }, [isSupabaseMode, loading, repository]);

  return {
    tasks,
    categories,
    settings,
    loading,
    error,
    isSupabase: isSupabaseMode,
    addTask,
    updateTask,
    deleteTask,
    addCategory,
    deleteCategory,
    updateSettings,
    clearAll,
  };
}
