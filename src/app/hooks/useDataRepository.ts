import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, Category, Settings } from '../types';
import { SupabaseRepository } from '../services/SupabaseRepository';
import { isSupabaseConfigured } from '../lib/supabase';
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

export function useDataRepository() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const repository = useMemo(() => new SupabaseRepository(), []);

  // Verificar se deve usar modo Supabase
  const useSupabase = useMemo(() => {
    return isSupabaseConfigured && !!user;
  }, [isSupabaseConfigured, user]);

  // Efeito para monitorar autenticação
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Carregar dados (executa quando authLoading termina ou quando user muda)
  useEffect(() => {
    // Se ainda verificando auth, esperar
    if (authLoading) {
      return;
    }

    // Modo local (sem Supabase configurado ou usuário não logado)
    if (!isSupabaseConfigured || !user) {
      const localTasks = localStorage.getItem('agenda-tasks');
      const localCategories = localStorage.getItem('agenda-categories');
      const localSettings = localStorage.getItem('agenda-settings');
      
      if (localTasks) setTasks(JSON.parse(localTasks));
      if (localCategories) setCategories(JSON.parse(localCategories));
      if (localSettings) setSettings(JSON.parse(localSettings));
      setLoading(false);
      return;
    }

    // Modo Supabase (usuário logado e Supabase configurado)
    const loadData = async () => {
      try {
        setLoading(true);
        const [tasksData, categoriesData, settingsData] = await Promise.all([
          repository.getTasks(),
          repository.getCategories(),
          repository.getSettings(),
        ]);
        
        setTasks(tasksData || []);
        setCategories(categoriesData || INITIAL_CATEGORIES);
        setSettings(settingsData || INITIAL_SETTINGS);
        setError(null);
      } catch (err: any) {
        console.error('Erro ao carregar dados:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authLoading, user, isSupabaseConfigured, repository]);

  // Salvar no localStorage apenas quando não está usando Supabase
  useEffect(() => {
    if (!useSupabase) {
      localStorage.setItem('agenda-tasks', JSON.stringify(tasks));
    }
  }, [tasks, useSupabase]);

  useEffect(() => {
    if (!useSupabase) {
      localStorage.setItem('agenda-categories', JSON.stringify(categories));
    }
  }, [categories, useSupabase]);

  useEffect(() => {
    if (!useSupabase) {
      localStorage.setItem('agenda-settings', JSON.stringify(settings));
    }
  }, [settings, useSupabase]);

  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdById' | 'assignedToId' | 'workspaceId'>) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdById: user?.id || 'local-user',
      assignedToId: '',
      workspaceId: '',
    };

    if (useSupabase) {
      try {
        await repository.createTask(newTask);
        setTasks(prev => [newTask, ...prev]);
      } catch (err) {
        throw err;
      }
    } else {
      setTasks(prev => [newTask, ...prev]);
    }
  }, [user, useSupabase, repository]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    if (useSupabase) {
      try {
        await repository.updateTask(id, updates);
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      } catch (err) {
        throw err;
      }
    } else {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
  }, [useSupabase, repository]);

  const deleteTask = useCallback(async (id: string) => {
    if (useSupabase) {
      try {
        await repository.deleteTask(id);
        setTasks(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        throw err;
      }
    } else {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  }, [useSupabase, repository]);

  const addCategory = useCallback(async (name: string, color: string) => {
    const newCategory: Category = {
      id: crypto.randomUUID(),
      name,
      color,
    };

    if (useSupabase) {
      try {
        await repository.createCategory(newCategory);
        setCategories(prev => [...prev, newCategory]);
      } catch (err) {
        throw err;
      }
    } else {
      setCategories(prev => [...prev, newCategory]);
    }
  }, [useSupabase, repository]);

  const deleteCategory = useCallback(async (id: string) => {
    if (useSupabase) {
      try {
        await repository.deleteCategory(id);
        setCategories(prev => prev.filter(c => c.id !== id));
        setTasks(prev => prev.map(t => t.categoryId === id ? { ...t, categoryId: undefined } : t));
      } catch (err) {
        throw err;
      }
    } else {
      setCategories(prev => prev.filter(c => c.id !== id));
      setTasks(prev => prev.map(t => t.categoryId === id ? { ...t, categoryId: undefined } : t));
    }
  }, [useSupabase, repository]);

  const updateSettings = useCallback(async (newSettings: Settings) => {
    if (useSupabase) {
      try {
        await repository.updateSettings(newSettings);
        setSettings(newSettings);
      } catch (err) {
        throw err;
      }
    } else {
      setSettings(newSettings);
    }
  }, [useSupabase, repository]);

  const clearAll = useCallback(async () => {
    if (useSupabase) {
      try {
        await repository.clearAll();
        setTasks([]);
        setCategories(INITIAL_CATEGORIES);
        setSettings(INITIAL_SETTINGS);
      } catch (err) {
        throw err;
      }
    } else {
      setTasks([]);
      setCategories(INITIAL_CATEGORIES);
      setSettings(INITIAL_SETTINGS);
    }
  }, [useSupabase, repository]);

  return {
    tasks,
    categories,
    settings,
    loading,
    error,
    isSupabase: useSupabase,
    addTask,
    updateTask,
    deleteTask,
    addCategory,
    deleteCategory,
    updateSettings,
    clearAll,
  };
}
