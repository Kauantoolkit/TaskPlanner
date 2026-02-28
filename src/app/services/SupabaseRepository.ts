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
 * Schema conforme SUPABASE_SETUP.md
 */
export class SupabaseRepository implements IDataRepository {
  
  private async getUserId(): Promise<string> {
    console.log('[SupabaseRepository] getUserId: Buscando usuário...');
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('[SupabaseRepository] getUserId: Erro ao buscar usuário:', error);
      throw new Error('Erro ao buscar usuário: ' + error.message);
    }
    if (!user) {
      console.error('[SupabaseRepository] getUserId: Usuário não encontrado');
      throw new Error('Usuário não autenticado');
    }
    console.log('[SupabaseRepository] getUserId: Usuário encontrado:', user.id);
    return user.id;
  }

  /**
   * Busca ou cria o workspace do usuário
   * O primeiro login cria um workspace "Personal" automaticamente
   */
  private async getOrCreateUserWorkspace(): Promise<{ workspaceId: string; memberId: string }> {
    console.log('[SupabaseRepository] getOrCreateUserWorkspace: Iniciando...');
    const userId = await this.getUserId();
    console.log('[SupabaseRepository] getOrCreateUserWorkspace: userId =', userId);
    
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || '';
    console.log('[SupabaseRepository] getOrCreateUserWorkspace: userEmail =', userEmail);

    // Buscar workspaces do usuário
    console.log('[SupabaseRepository] getOrCreateUserWorkspace: Buscando workspaces...');
    const { data: workspaces, error: wsError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);

    if (wsError) {
      console.error('[SupabaseRepository] getOrCreateUserWorkspace: Erro ao buscar workspaces:', wsError);
      throw wsError;
    }
    console.log('[SupabaseRepository] getOrCreateUserWorkspace: workspaces =', workspaces);

    let workspaceId: string;

    if (workspaces && workspaces.length > 0) {
      // Workspace já existe
      workspaceId = workspaces[0].id;
    } else {
      // Criar workspace pessoal
      const { data: newWorkspace, error: createError } = await supabase
        .from('workspaces')
        .insert({
          name: 'Meu Workspace',
          type: 'personal',
          owner_id: userId,
        })
        .select('id')
        .single();

      if (createError) throw createError;
      workspaceId = newWorkspace.id;
    }

    // Buscar ou criar membro
    const { data: members, error: memError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .limit(1);

    if (memError) throw memError;

    let memberId: string;

    if (members && members.length > 0) {
      memberId = members[0].id;
    } else {
      // Criar membro
      const { data: newMember, error: createMemError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          role: 'owner',
          name: userEmail.split('@')[0],
          email: userEmail,
        })
        .select('id')
        .single();

      if (createMemError) throw createMemError;
      memberId = newMember.id;
    }

    return { workspaceId, memberId };
  }

  // ===== TASKS =====
  async getTasks(): Promise<Task[]> {
    const { workspaceId } = await this.getOrCreateUserWorkspace();

    // Especificar colunas explicitamente ao invés de * (PostgREST pode bloquear *)
    const { data, error } = await supabase
      .from('tasks')
      .select('id, text, is_permanent, completed_dates, date, completed, category, is_delivery, delivery_date, assigned_to_id, created_by_id, workspace_id, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      text: row.text,
      isPermanent: row.is_permanent,
      completedDates: row.completed_dates || [],
      date: row.date,
      completed: row.completed,
      categoryId: row.category,
      isDelivery: row.is_delivery,
      deliveryDate: row.delivery_date,
      assignedToId: row.assigned_to_id,
      createdById: row.created_by_id,
      workspaceId: row.workspace_id,
    }));
  }

  async createTask(task: Task): Promise<Task> {
    const { workspaceId, memberId } = await this.getOrCreateUserWorkspace();

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        id: task.id,
        workspace_id: workspaceId,
        assigned_to_id: task.assignedToId || memberId,
        created_by_id: memberId,
        text: task.text,
        is_permanent: task.isPermanent,
        completed_dates: task.completedDates,
        date: task.date || new Date().toISOString().split('T')[0],
        completed: task.completed || false,
        category: task.categoryId || null, // Banco usa 'category' como texto
        is_delivery: task.isDelivery || false,
        delivery_date: task.deliveryDate || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar task:', error);
      throw error;
    }
    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (updates.text !== undefined) updateData.text = updates.text;
    if (updates.isPermanent !== undefined) updateData.is_permanent = updates.isPermanent;
    if (updates.completedDates !== undefined) updateData.completed_dates = updates.completedDates;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.completed !== undefined) updateData.completed = updates.completed;
    if (updates.categoryId !== undefined) updateData.category = updates.categoryId; // Banco usa 'category'
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
      categoryId: data.category,
      isDelivery: data.is_delivery,
      deliveryDate: data.delivery_date,
      assignedToId: data.assigned_to_id,
      createdById: data.created_by_id,
      workspaceId: data.workspace_id,
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
    const { workspaceId } = await this.getOrCreateUserWorkspace();

    // Especificar colunas explicitamente ao invés de *
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, color, workspace_id, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Se não tem categorias, cria as iniciais
    if (!data || data.length === 0) {
      const createdCategories: Category[] = [];
      for (const cat of INITIAL_CATEGORIES) {
        try {
          const created = await this.createCategory(cat);
          createdCategories.push(created);
        } catch (e: any) {
          // Se der erro de uniqueness, a categoria já existe
          if (e.code !== '23505') throw e;
        }
      }
      // Se não criou nenhuma, busca as que existem
      if (createdCategories.length === 0) {
        return this.getCategories();
      }
      return createdCategories;
    }

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      color: row.color,
    }));
  }

  async createCategory(category: Category): Promise<Category> {
    const { workspaceId } = await this.getOrCreateUserWorkspace();

    const { error } = await supabase
      .from('categories')
      .insert({
        id: category.id,
        workspace_id: workspaceId,
        name: category.name,
        color: category.color,
      });

    if (error) throw error;
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    const { data: category } = await supabase
      .from('categories')
      .select('name')
      .eq('id', id)
      .single();

    const categoryName = category?.name;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Remove category from tasks (busca pelo nome pois banco usa 'category' como texto)
    if (categoryName) {
      await supabase
        .from('tasks')
        .update({ category: null })
        .eq('category', categoryName);
    }
  }

  // ===== SETTINGS =====
  async getSettings(): Promise<Settings> {
    const { workspaceId } = await this.getOrCreateUserWorkspace();

    // Buscar cada setting individualmente - especificar colunas explicitamente
    const settingsKeys = ['darkMode', 'showCompleted', 'confirmDelete'];
    const result: any = {};

    for (const key of settingsKeys) {
      const { data, error } = await supabase
        .from('settings')
        .select('value, key')
        .eq('workspace_id', workspaceId)
        .eq('key', key)
        .single();

      if (!error && data) {
        // O valor é armazenado como JSONB, ex: {"value": true}
        result[key] = data.value?.value ?? data.value;
      }
    }

    // Se não encontrou nenhuma, cria as padrão
    const hasAnySetting = Object.keys(result).some(k => result[k] !== undefined);
    if (!hasAnySetting) {
      await this.updateSettings(INITIAL_SETTINGS);
      return INITIAL_SETTINGS;
    }

    return {
      darkMode: result.darkMode ?? INITIAL_SETTINGS.darkMode,
      showCompleted: result.showCompleted ?? INITIAL_SETTINGS.showCompleted,
      confirmDelete: result.confirmDelete ?? INITIAL_SETTINGS.confirmDelete,
    };
  }

  async updateSettings(settings: Settings): Promise<Settings> {
    const { workspaceId } = await this.getOrCreateUserWorkspace();

    // Salvar cada setting como entrada separada com JSONB
    const settingsToSave = [
      { key: 'darkMode', value: settings.darkMode },
      { key: 'showCompleted', value: settings.showCompleted },
      { key: 'confirmDelete', value: settings.confirmDelete },
    ];

    for (const { key, value } of settingsToSave) {
      const { error } = await supabase
        .from('settings')
        .upsert({
          workspace_id: workspaceId,
          key: key,
          value: { value: value },
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    }

    return settings;
  }

  // ===== BULK OPERATIONS =====
  async clearAll(): Promise<void> {
    const { workspaceId } = await this.getOrCreateUserWorkspace();

    // Deletar todas as tasks do workspace
    await supabase.from('tasks').delete().eq('workspace_id', workspaceId);

    // Deletar todas as categorias do workspace
    await supabase.from('categories').delete().eq('workspace_id', workspaceId);

    // Deletar todas as settings do workspace
    await supabase.from('settings').delete().eq('workspace_id', workspaceId);

    // Recriar categorias iniciais
    for (const cat of INITIAL_CATEGORIES) {
      await this.createCategory(cat);
    }
  }
}
