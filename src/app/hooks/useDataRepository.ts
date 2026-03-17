import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, Category, Settings } from '../types';
import { SupabaseRepository } from '../services/SupabaseRepository';
import { useWorkspace } from '../context/WorkspaceContext';

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
  sortByTime: true,
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
  // Workspace context — provides resolved workspaceId and memberId
  const { currentWorkspaceId: workspaceId, currentMemberId: memberId, loading: workspaceLoading } = useWorkspace();

  // Estados sempre na mesma ordem
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSupabaseMode, setIsSupabaseMode] = useState(false);

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
      // Silenciosamente ignora erros ao carregar localStorage
    }
  }, []);

  // Função para salvar no localStorage
  const saveToLocalStorage = useCallback(() => {
    try {
      localStorage.setItem('agenda-tasks', JSON.stringify(tasks));
      localStorage.setItem('agenda-categories', JSON.stringify(categories));
      localStorage.setItem('agenda-settings', JSON.stringify(settings));
    } catch (e) {
      // Silenciosamente ignora erros ao salvar localStorage
    }
  }, [tasks, categories, settings]);

  // Keep repository in sync with active workspace
  useEffect(() => {
    if (workspaceId && memberId) {
      repository.setWorkspace(workspaceId, memberId);
    }
  }, [workspaceId, memberId, repository]);

  // Load data whenever workspace is ready or changes
  useEffect(() => {
    // Wait for workspace context to finish loading
    if (workspaceLoading) return;

    // Local mode — use localStorage
    if (!isSupabaseConfigured) {
      loadFromLocalStorage();
      setLoading(false);
      setIsSupabaseMode(false);
      return;
    }

    // Supabase mode but no workspace resolved yet
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setIsSupabaseMode(true);

    // Sync workspace to repository before loading
    repository.setWorkspace(workspaceId, memberId);

    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (!cancelled) {
            setError('Sessão expirada. Por favor, faça login novamente.');
            setLoading(false);
          }
          return;
        }

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 8000);
        });

        const loadPromise = Promise.all([
          repository.getTasks(),
          repository.getCategories(),
          repository.getSettings(),
        ]);

        const results = await Promise.race([loadPromise, timeoutPromise]);

        if (!cancelled) {
          const [tasksData, categoriesData, settingsData] = results;
          setTasks(tasksData || []);
          setCategories(categoriesData || INITIAL_CATEGORIES);
          setSettings(settingsData || INITIAL_SETTINGS);
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
          setError(errorMessage);
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, workspaceLoading, repository, memberId, loadFromLocalStorage]);

  // Salva no localStorage APENAS quando NÃO está em modo Supabase
  useEffect(() => {
    if (!loading && !isSupabaseMode) {
      saveToLocalStorage();
    }
  }, [tasks, categories, settings, loading, isSupabaseMode, saveToLocalStorage]);

  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdById' | 'assignedToId' | 'workspaceId'>) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdById: memberId || 'local-user',
      assignedToId: memberId || '',
      workspaceId: workspaceId || '',
    };

    setTasks(prev => [newTask, ...prev]);

    if (isSupabaseMode && !loading) {
      try {
        await repository.createTask(newTask);
      } catch (err) {
        // Silenciosamente ignora erros
      }
    }
  }, [isSupabaseMode, loading, repository, memberId, workspaceId]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    if (isSupabaseMode && !loading) {
      try {
        await repository.updateTask(id, updates);
      } catch (err) {
        // Silenciosamente ignora erros
      }
    }
  }, [isSupabaseMode, loading, repository]);

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));

    if (isSupabaseMode && !loading) {
      try {
        await repository.deleteTask(id);
      } catch (err) {
        // Silenciosamente ignora erros
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

    if (isSupabaseMode && !loading) {
      try {
        await repository.createCategory(newCategory);
      } catch (err) {
        // Silenciosamente ignora erros
      }
    }
  }, [isSupabaseMode, loading, repository]);

  const deleteCategory = useCallback(async (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setTasks(prev => prev.map(t => t.categoryId === id ? { ...t, categoryId: undefined } : t));

    if (isSupabaseMode && !loading) {
      try {
        await repository.deleteCategory(id);
      } catch (err) {
        // Silenciosamente ignora erros
      }
    }
  }, [isSupabaseMode, loading, repository]);

  const updateSettings = useCallback(async (newSettings: Settings) => {
    setSettings(newSettings);

    if (isSupabaseMode && !loading) {
      try {
        await repository.updateSettings(newSettings);
      } catch (err) {
        // Silenciosamente ignora erros
      }
    }
  }, [isSupabaseMode, loading, repository]);

  const clearAll = useCallback(async () => {
    setTasks([]);
    setCategories(INITIAL_CATEGORIES);
    setSettings(INITIAL_SETTINGS);

    if (isSupabaseMode && !loading) {
      try {
        await repository.clearAll();
      } catch (err) {
        // Silenciosamente ignora erros
      }
    }
  }, [isSupabaseMode, loading, repository]);

  const reorderTasks = useCallback((reorderedTasks: Task[]) => {
    setTasks(reorderedTasks);
  }, []);

  return {
    tasks,
    categories,
    settings,
    loading: loading || workspaceLoading,
    error,
    isSupabase: isSupabaseMode,
    addTask,
    updateTask,
    deleteTask,
    addCategory,
    deleteCategory,
    updateSettings,
    clearAll,
    reorderTasks,
  };
}
