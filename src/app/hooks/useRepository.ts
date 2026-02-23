import { useState, useEffect, useCallback } from 'react';
import { dataRepository } from '../services';
import { Task, Category, Settings } from '../types';

/**
 * Hook customizado para gerenciar dados usando o repository pattern
 * Funciona tanto com LocalStorage quanto PostgreSQL (após migração)
 */

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dataRepository.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const createTask = async (task: Task) => {
    const created = await dataRepository.createTask(task);
    setTasks(prev => [...prev, created]);
    return created;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const updated = await dataRepository.updateTask(id, updates);
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    return updated;
  };

  const deleteTask = async (id: string) => {
    await dataRepository.deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  return { tasks, loading, createTask, updateTask, deleteTask, refetch: loadTasks };
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dataRepository.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const createCategory = async (category: Category) => {
    const created = await dataRepository.createCategory(category);
    setCategories(prev => [...prev, created]);
    return created;
  };

  const deleteCategory = async (id: string) => {
    await dataRepository.deleteCategory(id);
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  return { categories, loading, createCategory, deleteCategory, refetch: loadCategories };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dataRepository.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = async (newSettings: Settings) => {
    const updated = await dataRepository.updateSettings(newSettings);
    setSettings(updated);
    return updated;
  };

  return { settings, loading, updateSettings, refetch: loadSettings };
}

export function useClearAll() {
  const clearAll = async () => {
    await dataRepository.clearAll();
  };

  return { clearAll };
}
