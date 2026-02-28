import { useState, useEffect, useCallback } from 'react';
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

  const repository = new SupabaseRepository();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const localTasks = localStorage.getItem('agenda-tasks');
      const localCategories = localStorage.getItem('agenda-categories');
      const localSettings = localStorage.getItem('agenda-settings');
      
      if (localTasks) setTasks(JSON.parse(localTasks));
      if (localCategories) setCategories(JSON.parse(localCategories));
      if (localSettings) setSettings(JSON.parse(localSettings));
      setLoading(false);
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

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
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, isSupabaseConfigured]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('agenda-tasks', JSON.stringify(tasks));
    }
  }, [tasks, isSupabaseConfigured]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('agenda-categories', JSON.stringify(categories));
    }
  }, [categories, isSupabaseConfigured]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('agenda-settings', JSON.stringify(settings));
    }
  }, [settings, isSupabaseConfigured]);

  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdById' | 'assignedToId' | 'workspaceId'>) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdById: user?.id || 'local-user',
      assignedToId: '',
      workspaceId: '',
    };

    if (isSupabaseConfigured && user) {
      try {
        await repository.createTask(newTask);
        setTasks(prev => [newTask, ...prev]);
      } catch (err) {
        throw err;
      }
    } else {
      setTasks(prev => [newTask, ...prev]);
    }
  }, [user]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    if (isSupabaseConfigured && user) {
      try {
        await repository.updateTask(id, updates);
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      } catch (err) {
        throw err;
      }
    } else {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
  }, [user]);

  const deleteTask = useCallback(async (id: string) => {
    if (isSupabaseConfigured && user) {
      try {
        await repository.deleteTask(id);
        setTasks(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        throw err;
      }
    } else {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  }, [user]);

  const addCategory = useCallback(async (name: string, color: string) => {
    const newCategory: Category = {
      id: crypto.randomUUID(),
      name,
      color,
    };

    if (isSupabaseConfigured && user) {
      try {
        await repository.createCategory(newCategory);
        setCategories(prev => [...prev, newCategory]);
      } catch (err) {
        throw err;
      }
    } else {
      setCategories(prev => [...prev, newCategory]);
    }
  }, [user]);

  const deleteCategory = useCallback(async (id: string) => {
    if (isSupabaseConfigured && user) {
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
  }, [user]);

  const updateSettings = useCallback(async (newSettings: Settings) => {
    if (isSupabaseConfigured && user) {
      try {
        await repository.updateSettings(newSettings);
        setSettings(newSettings);
      } catch (err) {
        throw err;
      }
    } else {
      setSettings(newSettings);
    }
  }, [user]);

  const clearAll = useCallback(async () => {
    if (isSupabaseConfigured && user) {
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
  }, [user]);

  return {
    tasks,
    categories,
    settings,
    loading,
    error,
    isSupabase: isSupabaseConfigured && !!user,
    addTask,
    updateTask,
    deleteTask,
    addCategory,
    deleteCategory,
    updateSettings,
    clearAll,
  };
}
