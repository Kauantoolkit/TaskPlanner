import { Task, Category, Settings, KanbanBoard, KanbanBoardFull, KanbanColumn, KanbanCard } from '../types';
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
  sortByTime: true,
};


/**
 * Repository usando Supabase (PostgreSQL)
 * Schema conforme SUPABASE_SETUP.md
 */
export class SupabaseRepository implements IDataRepository {
  private _workspaceId: string | null = null;
  private _memberId: string | null = null;

  /** Called by useDataRepository whenever the active workspace changes. */
  setWorkspace(workspaceId: string, memberId: string) {
    this._workspaceId = workspaceId;
    this._memberId = memberId;
  }

  private async getUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      throw new Error('Erro ao buscar usuário: ' + error.message);
    }
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    return user.id;
  }

  /**
   * Busca ou cria o workspace do usuário
   * O primeiro login cria um workspace "Personal" automaticamente
   */
  private async getOrCreateUserWorkspace(): Promise<{ workspaceId: string; memberId: string }> {
    // If workspaceId was injected by WorkspaceContext, use it directly.
    // memberId may still be empty if the member row wasn't resolved yet — that's OK for reads.
    if (this._workspaceId) {
      return { workspaceId: this._workspaceId, memberId: this._memberId || '' };
    }

    const userId = await this.getUserId();
    
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || '';

    // Buscar workspaces do usuário — primeiro via workspace_members (inclui membros convidados),
    // depois via owner_id como fallback
    const { data: memberRows } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1);

    const { data: workspaces, error: wsError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);

    if (wsError) {
      throw wsError;
    }

    let workspaceId: string;

    if (memberRows && memberRows.length > 0) {
      workspaceId = memberRows[0].workspace_id;
    } else if (workspaces && workspaces.length > 0) {
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
    const { workspaceId, memberId } = await this.getOrCreateUserWorkspace();

// Especificar colunas explicitamente ao invés de * (PostgREST pode bloquear *)
    const { data, error } = await supabase
      .from('tasks')
      .select('id, text, is_permanent, completed_dates, date, completed, category, is_delivery, delivery_date, recurring_type, recurring_days, scheduled_time, estimated_duration_minutes, yellow_alert_minutes, started_at, assigned_to_id, created_by_id, workspace_id, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      // Fornecer mensagem de erro mais detalhada
      if (error.code === '42501') {
        throw new Error('Permissão negada. Execute o script SUPABASE_FIX_RLS_V2.sql no SQL Editor do Supabase.');
      } else if (error.code === '42P01') {
        throw new Error('Tabela tasks não existe. Execute o script SUPABASE_CREATE.sql no SQL Editor do Supabase.');
      } else if (error.code === '400') {
        throw new Error('Erro na consulta (400). Verifique as políticas RLS. Execute SUPABASE_FIX_RLS_V2.sql.');
      }
      throw new Error(`Erro ao buscar tasks: ${error.message} (${error.code})`);
    }
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
      recurringType: row.recurring_type,
      recurringDays: Array.isArray(row.recurring_days)
        ? row.recurring_days
        : (typeof row.recurring_days === 'string' ? JSON.parse(row.recurring_days) : []),
      scheduledTime: row.scheduled_time ? row.scheduled_time.substring(0, 5) : undefined,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      yellowAlertMinutes: row.yellow_alert_minutes,
      startedAt: row.started_at,
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
      completed_dates: task.completedDates ?? [],

      date: task.date ?? new Date().toISOString().slice(0, 10),

      completed: task.completed ?? false,

      category: task.categoryId ?? null,

      is_delivery: task.isDelivery ?? false,
      delivery_date: task.deliveryDate ?? null,

      recurring_type: task.recurringType ?? null,

      // ❗ CORREÇÃO (não usar JSON.stringify)
      recurring_days: task.recurringDays ?? null,

      scheduled_time: task.scheduledTime ?? null,

      estimated_duration_minutes: task.estimatedDurationMinutes ?? null,

      yellow_alert_minutes: task.yellowAlertMinutes ?? null,

      started_at: task.startedAt ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    text: data.text,
    isPermanent: data.is_permanent,
    completedDates: data.completed_dates ?? [],
    date: data.date,
    completed: data.completed,
    categoryId: data.category,
    isDelivery: data.is_delivery,
    deliveryDate: data.delivery_date,
    recurringType: data.recurring_type,
    recurringDays: Array.isArray(data.recurring_days)
      ? data.recurring_days
      : (typeof data.recurring_days === 'string' ? JSON.parse(data.recurring_days) : []),
    scheduledTime: data.scheduled_time ? data.scheduled_time.substring(0, 5) : undefined,
    estimatedDurationMinutes: data.estimated_duration_minutes,
    yellowAlertMinutes: data.yellow_alert_minutes,
    startedAt: data.started_at,
    assignedToId: data.assigned_to_id,
    createdById: data.created_by_id,
    workspaceId: data.workspace_id,
  };
}


  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (updates.text !== undefined) updateData.text = updates.text;
  if (updates.isPermanent !== undefined) updateData.is_permanent = updates.isPermanent;
  if (updates.completedDates !== undefined) updateData.completed_dates = updates.completedDates;
  if (updates.date !== undefined) updateData.date = updates.date;
  if (updates.completed !== undefined) updateData.completed = updates.completed;

  if (updates.categoryId !== undefined)
    updateData.category = updates.categoryId;

  if (updates.isDelivery !== undefined)
    updateData.is_delivery = updates.isDelivery;

  if (updates.deliveryDate !== undefined)
    updateData.delivery_date = updates.deliveryDate;

  if (updates.recurringType !== undefined)
    updateData.recurring_type = updates.recurringType;

  // ❗ CORREÇÃO
  if (updates.recurringDays !== undefined)
    updateData.recurring_days = updates.recurringDays ?? null;

  if (updates.scheduledTime !== undefined)
    updateData.scheduled_time = updates.scheduledTime;

  if (updates.estimatedDurationMinutes !== undefined)
    updateData.estimated_duration_minutes = updates.estimatedDurationMinutes;

  if (updates.yellowAlertMinutes !== undefined)
    updateData.yellow_alert_minutes = updates.yellowAlertMinutes;

  if (updates.startedAt !== undefined)
    updateData.started_at = updates.startedAt;

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
    completedDates: data.completed_dates ?? [],
    date: data.date,
    completed: data.completed,
    categoryId: data.category,
    isDelivery: data.is_delivery,
    deliveryDate: data.delivery_date,
    recurringType: data.recurring_type,
    recurringDays: Array.isArray(data.recurring_days)
      ? data.recurring_days
      : (typeof data.recurring_days === 'string' ? JSON.parse(data.recurring_days) : []),
    scheduledTime: data.scheduled_time ? data.scheduled_time.substring(0, 5) : undefined,
    estimatedDurationMinutes: data.estimated_duration_minutes,
    yellowAlertMinutes: data.yellow_alert_minutes,
    startedAt: data.started_at,

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
    const settingsKeys = ['darkMode', 'showCompleted', 'confirmDelete', 'sortByTime'];
    const result: any = {};

    for (const key of settingsKeys) {
      const { data, error } = await supabase
        .from('settings')
        .select('value, key')
        .eq('workspace_id', workspaceId)
        .eq('key', key)
        .maybeSingle();

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
  sortByTime: result.sortByTime ?? INITIAL_SETTINGS.sortByTime,
};

  }

  async updateSettings(settings: Settings): Promise<Settings> {
    const { workspaceId } = await this.getOrCreateUserWorkspace();

    // Salvar cada setting como entrada separada com JSONB
    const settingsToSave = [
      { key: 'darkMode', value: settings.darkMode },
      { key: 'showCompleted', value: settings.showCompleted },
      { key: 'confirmDelete', value: settings.confirmDelete },
      { key: 'sortByTime', value: settings.sortByTime },
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

  // ===== KANBAN =====

  private mapBoard(r: Record<string, unknown>): KanbanBoard {
    return {
      id: r.id as string,
      taskId: r.task_id as string,
      workspaceId: r.workspace_id as string,
      title: r.title as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }

  private mapColumn(r: Record<string, unknown>): KanbanColumn {
    return {
      id: r.id as string,
      boardId: r.board_id as string,
      title: r.title as string,
      order: r.order as number,
      color: r.color as string | undefined,
      isCompletionColumn: r.is_completion_column as boolean,
    };
  }

  private mapCard(r: Record<string, unknown>): KanbanCard {
    return {
      id: r.id as string,
      columnId: r.column_id as string,
      boardId: r.board_id as string,
      title: r.title as string,
      description: r.description as string | undefined,
      order: r.order as number,
      assignedToId: r.assigned_to_id as string | undefined,
      dueDate: r.due_date as string | undefined,
      labels: (r.labels as string[]) ?? [],
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }

  async getKanbanBoard(taskId: string): Promise<KanbanBoardFull | null> {
    const { data: board } = await supabase
      .from('kanban_boards')
      .select('*')
      .eq('task_id', taskId)
      .maybeSingle();

    if (!board) return null;

    const [{ data: columns }, { data: cards }] = await Promise.all([
      supabase.from('kanban_columns').select('*').eq('board_id', board.id).order('order'),
      supabase.from('kanban_cards').select('*').eq('board_id', board.id).order('order'),
    ]);

    const cardsByColumn: Record<string, KanbanCard[]> = {};
    for (const col of columns ?? []) {
      cardsByColumn[col.id] = (cards ?? [])
        .filter((c: any) => c.column_id === col.id)
        .map((c: any) => this.mapCard(c));
    }

    return {
      board: this.mapBoard(board),
      columns: (columns ?? []).map((c: any) => this.mapColumn(c)),
      cards: cardsByColumn,
    };
  }

  async createKanbanBoard(
    taskId: string,
    workspaceId: string,
    title: string,
    defaultColumns = [
      { title: 'A Fazer', isCompletionColumn: false },
      { title: 'Em Progresso', isCompletionColumn: false },
      { title: 'Concluído', isCompletionColumn: true },
    ]
  ): Promise<KanbanBoard> {
    const { data: boardId, error } = await supabase.rpc('create_kanban_board_with_columns', {
      p_task_id: taskId,
      p_workspace_id: workspaceId,
      p_title: title,
      p_columns: defaultColumns.map(c => ({
        title: c.title,
        is_completion_column: c.isCompletionColumn ?? false,
        color: (c as any).color ?? null,
      })),
    });

    if (error) throw error;

    const { data: board } = await supabase
      .from('kanban_boards')
      .select('*')
      .eq('id', boardId)
      .single();

    return this.mapBoard(board);
  }

  async deleteKanbanBoard(boardId: string): Promise<void> {
    const { error } = await supabase.from('kanban_boards').delete().eq('id', boardId);
    if (error) throw error;
  }

  async createKanbanColumn(boardId: string, title: string, order: number, opts?: Partial<KanbanColumn>): Promise<KanbanColumn> {
    const { data, error } = await supabase
      .from('kanban_columns')
      .insert({
        board_id: boardId,
        title,
        order,
        color: opts?.color ?? null,
        is_completion_column: opts?.isCompletionColumn ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapColumn(data);
  }

  async updateKanbanColumn(columnId: string, data: Partial<Pick<KanbanColumn, 'title' | 'order' | 'color' | 'isCompletionColumn'>>): Promise<void> {
    const update: any = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.order !== undefined) update.order = data.order;
    if (data.color !== undefined) update.color = data.color;
    if (data.isCompletionColumn !== undefined) update.is_completion_column = data.isCompletionColumn;

    const { error } = await supabase.from('kanban_columns').update(update).eq('id', columnId);
    if (error) throw error;
  }

  async deleteKanbanColumn(columnId: string): Promise<void> {
    const { error } = await supabase.from('kanban_columns').delete().eq('id', columnId);
    if (error) throw error;
  }

  async reorderKanbanColumns(boardId: string, orderedColumnIds: string[]): Promise<void> {
    const { error } = await supabase.rpc('reorder_kanban_columns', {
      p_board_id: boardId,
      p_column_ids: orderedColumnIds,
    });
    if (error) throw error;
  }

  async createKanbanCard(columnId: string, boardId: string, title: string, opts?: Partial<KanbanCard>): Promise<KanbanCard> {
    const { data: existingCards } = await supabase
      .from('kanban_cards')
      .select('order')
      .eq('column_id', columnId)
      .order('order', { ascending: false })
      .limit(1);

    const nextOrder = existingCards && existingCards.length > 0 ? existingCards[0].order + 1 : 0;

    const { data, error } = await supabase
      .from('kanban_cards')
      .insert({
        column_id: columnId,
        board_id: boardId,
        title,
        description: opts?.description ?? null,
        order: opts?.order ?? nextOrder,
        assigned_to_id: opts?.assignedToId ?? null,
        due_date: opts?.dueDate ?? null,
        labels: opts?.labels ?? [],
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapCard(data);
  }

  async updateKanbanCard(cardId: string, data: Partial<Pick<KanbanCard, 'title' | 'description' | 'order' | 'assignedToId' | 'dueDate' | 'labels'>>): Promise<void> {
    const update: any = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.description !== undefined) update.description = data.description;
    if (data.order !== undefined) update.order = data.order;
    if (data.assignedToId !== undefined) update.assigned_to_id = data.assignedToId;
    if (data.dueDate !== undefined) update.due_date = data.dueDate;
    if (data.labels !== undefined) update.labels = data.labels;

    const { error } = await supabase.from('kanban_cards').update(update).eq('id', cardId);
    if (error) throw error;
  }

  async deleteKanbanCard(cardId: string): Promise<void> {
    const { error } = await supabase.from('kanban_cards').delete().eq('id', cardId);
    if (error) throw error;
  }

  async moveKanbanCard(cardId: string, toColumnId: string, newOrder: number): Promise<void> {
    const { error } = await supabase.rpc('move_kanban_card', {
      p_card_id: cardId,
      p_to_column: toColumnId,
      p_new_order: newOrder,
    });
    if (error) throw error;
  }

  async reorderKanbanCards(columnId: string, orderedCardIds: string[]): Promise<void> {
    if (orderedCardIds.length === 0) return;
    const { error } = await supabase.rpc('reorder_kanban_cards', {
      p_column_id: columnId,
      p_card_ids: orderedCardIds,
    });
    if (error) throw error;
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
