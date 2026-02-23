import { Task, Category, Settings } from '../types';
import { IDataRepository } from './types';
import { supabase } from '../lib/supabase';

const INITIAL_CATEGORIES: Category[] = [
  { id: crypto.randomUUID(), name: 'Trabalho', color: 'bg-blue-500 text-white' },
  { id: crypto.randomUUID(), name: 'Pessoal', color: 'bg-emerald-500 text-white' },
  { id: crypto.randomUUID(), name: 'Saúde', color: 'bg-rose-500 text-white' },
];

const INITIAL_SETTINGS: Settings = {
  darkMode: false,
  showCompleted: true,
  confirmDelete: true,
};

/**
 * Repository usando Supabase (PostgreSQL)
 * Sincroniza dados na nuvem, com autenticação e RLS
 */
export class SupabaseRepository implements IDataRepository {
  
  private async getUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    return user.id;
  }

  // ===== TASKS =====
  async getTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map(row => ({
      id: row.id,
      text: row.text,
      isPermanent: row.is_permanent,
      completedDates: row.completed_dates || [],
      date: row.date,
      completed: row.completed,
      categoryId: row.category_id,
      isDelivery: row.is_delivery,
      deliveryDate: row.delivery_date,
    }));
  }

  async createTask(task: Task): Promise<Task> {
    const userId = await this.getUserId();

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        id: task.id,
        text: task.text,
        is_permanent: task.isPermanent,
        completed_dates: task.completedDates,
        date: task.date,
        completed: task.completed,
        category_id: task.categoryId,
        is_delivery: task.isDelivery,
        delivery_date: task.deliveryDate,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (updates.text !== undefined) updateData.text = updates.text;
    if (updates.isPermanent !== undefined) updateData.is_permanent = updates.isPermanent;
    if (updates.completedDates !== undefined) updateData.completed_dates = updates.completedDates;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.completed !== undefined) updateData.completed = updates.completed;
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
    if (updates.isDelivery !== undefined) updateData.is_delivery = updates.isDelivery;
    if (updates.deliveryDate !== undefined) updateData.delivery_date = updates.deliveryDate;

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      text: data.text,
      isPermanent: data.is_permanent,
      completedDates: data.completed_dates || [],
      date: data.date,
      completed: data.completed,
      categoryId: data.category_id,
      isDelivery: data.is_delivery,
      deliveryDate: data.delivery_date,
    };
  }

  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ===== CATEGORIES =====
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Se não tem categorias, cria as iniciais
    if (!data || data.length === 0) {
      const userId = await this.getUserId();
      for (const cat of INITIAL_CATEGORIES) {
        await supabase.from('categories').insert({
          id: cat.id,
          name: cat.name,
          color: cat.color,
          user_id: userId,
        });
      }
      return INITIAL_CATEGORIES;
    }

    return data.map(row => ({
      id: row.id,
      name: row.name,
      color: row.color,
    }));
  }

  async createCategory(category: Category): Promise<Category> {
    const userId = await this.getUserId();

    const { error } = await supabase
      .from('categories')
      .insert({
        id: category.id,
        name: category.name,
        color: category.color,
        user_id: userId,
      });

    if (error) throw error;
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Remove category from tasks (CASCADE já faz isso, mas vamos garantir)
    await supabase
      .from('tasks')
      .update({ category_id: null })
      .eq('category_id', id);
  }

  // ===== SETTINGS =====
  async getSettings(): Promise<Settings> {
    const userId = await this.getUserId();

    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Se não encontrou, cria settings padrão
    if (error && error.code === 'PGRST116') {
      await this.updateSettings(INITIAL_SETTINGS);
      return INITIAL_SETTINGS;
    }

    if (error) throw error;
    if (!data) return INITIAL_SETTINGS;

    return {
      darkMode: data.dark_mode,
      showCompleted: data.show_completed,
      confirmDelete: data.confirm_delete,
    };
  }

  async updateSettings(settings: Settings): Promise<Settings> {
    const userId = await this.getUserId();

    const { error } = await supabase
      .from('settings')
      .upsert({
        user_id: userId,
        dark_mode: settings.darkMode,
        show_completed: settings.showCompleted,
        confirm_delete: settings.confirmDelete,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    return settings;
  }

  // ===== BULK OPERATIONS =====
  async clearAll(): Promise<void> {
    const userId = await this.getUserId();

    // Deletar todas as tasks
    await supabase.from('tasks').delete().eq('user_id', userId);

    // Deletar todas as categorias
    await supabase.from('categories').delete().eq('user_id', userId);

    // Resetar settings
    await supabase.from('settings').delete().eq('user_id', userId);

    // Recriar categorias iniciais
    for (const cat of INITIAL_CATEGORIES) {
      await this.createCategory(cat);
    }
  }
}
