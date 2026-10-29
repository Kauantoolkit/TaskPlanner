// Acesso ao Supabase. Cada função faz uma coisa, devolve o modelo do app
// e lança Error em caso de falha (quem chama decide como avisar o usuário).

import { supabase } from '../lib/supabase';
import type { Json, WorkspaceType } from '../lib/database.types';
import type { IsoDate, Task, TaskDraft } from '../domain/tasks';
import type {
  Category, DailyLog, KanbanBoardFull, KanbanCard, KanbanColumn, Member, Preferences, Workspace,
} from '../types';
import { DEFAULT_PREFERENCES } from '../types';
import {
  categoryFromRow, dailyLogFromRow, draftToRow, kanbanBoardFromRow, kanbanCardFromRow,
  kanbanColumnFromRow, memberFromRow, preferencesFromRow, preferencesToRow, taskFromRow,
  taskPatchToRow, workspaceFromRow,
} from './mappers';

type Result<T> = { data: T; error: { message: string; code?: string } | null };

/** Lança o erro do PostgREST como Error comum (mensagem em português quando conhecida). */
function must<T>({ data, error }: Result<T>): NonNullable<T> {
  if (error) {
    const known: Record<string, string> = {
      '42501': 'Você não tem permissão para isso.',
      '23514': 'Dados inválidos para este tipo de tarefa.',
      '23505': 'Já existe um item com esse nome.',
    };
    throw new Error(known[error.code ?? ''] ?? error.message);
  }
  if (data === null || data === undefined) throw new Error('Resposta vazia do servidor.');
  return data as NonNullable<T>;
}

// ── Workspaces e membros ─────────────────────────────────────

export interface MyWorkspaces {
  workspaces: Workspace[];
  /** workspace_id → workspace_members.id do usuário logado */
  memberIdByWorkspace: Record<string, string>;
}

export async function fetchMyWorkspaces(userId: string): Promise<MyWorkspaces> {
  const memberships = must(await supabase
    .from('workspace_members')
    .select('id, workspace_id')
    .eq('user_id', userId));

  if (memberships.length === 0) return { workspaces: [], memberIdByWorkspace: {} };

  const rows = must(await supabase
    .from('workspaces')
    .select('id, name, type, owner_id, invite_code, created_at')
    .in('id', memberships.map(m => m.workspace_id))
    .order('created_at'));

  return {
    workspaces: rows.map(workspaceFromRow),
    memberIdByWorkspace: Object.fromEntries(memberships.map(m => [m.workspace_id, m.id])),
  };
}

export interface WorkspaceMembership {
  workspace: Workspace;
  memberId: string;
}

export async function createWorkspace(name: string, type: WorkspaceType): Promise<WorkspaceMembership> {
  const [r] = must(await supabase.rpc('create_workspace', { p_name: name, p_type: type }));
  return {
    workspace: workspaceFromRow({ ...r, id: r.workspace_id }),
    memberId: r.member_id,
  };
}

export async function joinWorkspace(code: string): Promise<WorkspaceMembership> {
  const { data, error } = await supabase.rpc('join_workspace', { p_code: code.trim() });
  if (error || !data?.length) throw new Error('Código de convite inválido.');
  const r = data[0];
  return {
    workspace: workspaceFromRow({ ...r, id: r.workspace_id, invite_code: null }),
    memberId: r.member_id,
  };
}

export async function regenerateInviteCode(workspaceId: string): Promise<string> {
  return must(await supabase.rpc('regenerate_invite_code', { p_workspace_id: workspaceId }));
}

export async function fetchMembers(workspaceId: string): Promise<Member[]> {
  const rows = must(await supabase
    .from('workspace_members')
    .select('id, user_id, name, email, role')
    .eq('workspace_id', workspaceId)
    .order('created_at'));
  // dono primeiro
  return rows.map(memberFromRow).sort((a, b) => Number(b.role === 'owner') - Number(a.role === 'owner'));
}

/** Dono removendo alguém, ou o próprio membro saindo. */
export async function removeMember(memberId: string): Promise<void> {
  must(await supabase.from('workspace_members').delete().eq('id', memberId).select('id').single());
}

// ── Tarefas ──────────────────────────────────────────────────

export async function fetchTasks(workspaceId: string): Promise<Task[]> {
  const rows = must(await supabase
    .from('tasks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true }));
  return rows.map(taskFromRow);
}

export async function createTask(
  input: { id: string; workspaceId: string; createdById: string; draft: TaskDraft },
): Promise<Task> {
  const row = must(await supabase
    .from('tasks')
    .insert({
      id: input.id,
      workspace_id: input.workspaceId,
      created_by_id: input.createdById,
      assigned_to_id: input.draft.assignedToId ?? input.createdById,
      ...draftToRow(input.draft),
    })
    .select('*')
    .single());
  return taskFromRow(row);
}

export async function updateTaskDraft(id: string, draft: TaskDraft): Promise<void> {
  must(await supabase.from('tasks').update(draftToRow(draft)).eq('id', id).select('id').single());
}

export async function patchTask(id: string, patch: Partial<Task>): Promise<void> {
  must(await supabase.from('tasks').update(taskPatchToRow(patch)).eq('id', id).select('id').single());
}

export async function deleteTask(id: string): Promise<void> {
  must(await supabase.from('tasks').delete().eq('id', id).select('id').single());
}

// ── Categorias ───────────────────────────────────────────────

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Trabalho', color: 'bg-blue-500 text-white' },
  { name: 'Pessoal', color: 'bg-emerald-500 text-white' },
  { name: 'Saúde', color: 'bg-rose-500 text-white' },
];

export async function fetchCategories(workspaceId: string): Promise<Category[]> {
  const rows = must(await supabase
    .from('categories')
    .select('id, workspace_id, name, color, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at'));
  return rows.map(categoryFromRow);
}

/** Cria as categorias padrão num workspace novo. Idempotente (unique por nome). */
export async function seedDefaultCategories(workspaceId: string): Promise<void> {
  must(await supabase
    .from('categories')
    .upsert(DEFAULT_CATEGORIES.map(c => ({ ...c, workspace_id: workspaceId })),
      { onConflict: 'workspace_id,name', ignoreDuplicates: true })
    .select('id'));
}

export async function createCategory(workspaceId: string, category: Category): Promise<void> {
  must(await supabase
    .from('categories')
    .insert({ id: category.id, workspace_id: workspaceId, name: category.name.trim(), color: category.color })
    .select('id')
    .single());
}

/** A FK com ON DELETE SET NULL limpa as tarefas que usavam a categoria. */
export async function deleteCategory(id: string): Promise<void> {
  must(await supabase.from('categories').delete().eq('id', id).select('id').single());
}

/** "Apagar todos os dados" do workspace (só o dono passa no RLS de tarefas alheias). */
export async function clearWorkspace(workspaceId: string): Promise<void> {
  must(await supabase.from('tasks').delete().eq('workspace_id', workspaceId).select('id'));
  must(await supabase.from('categories').delete().eq('workspace_id', workspaceId).select('id'));
  await seedDefaultCategories(workspaceId);
}

// ── Logs diários das entregas ────────────────────────────────

export async function fetchDailyLogs(taskIds: string[]): Promise<DailyLog[]> {
  if (taskIds.length === 0) return [];
  const rows = must(await supabase
    .from('task_daily_logs')
    .select('id, task_id, log_date, description, author_id, created_at, updated_at')
    .in('task_id', taskIds)
    .order('log_date'));
  return rows.map(dailyLogFromRow);
}

export async function saveDailyLog(
  input: { taskId: string; date: IsoDate; description: string; authorId: string },
): Promise<DailyLog> {
  const row = must(await supabase
    .from('task_daily_logs')
    .upsert(
      { task_id: input.taskId, log_date: input.date, description: input.description.trim(), author_id: input.authorId },
      { onConflict: 'task_id,log_date' },
    )
    .select('id, task_id, log_date, description, author_id, created_at, updated_at')
    .single());
  return dailyLogFromRow(row);
}

// ── Preferências ─────────────────────────────────────────────

export async function fetchPreferences(): Promise<Preferences> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('user_id, dark_mode, show_completed, confirm_delete, sort_by_time, updated_at')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? preferencesFromRow(data) : DEFAULT_PREFERENCES;
}

export async function savePreferences(userId: string, prefs: Preferences): Promise<void> {
  must(await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, ...preferencesToRow(prefs) })
    .select('user_id')
    .single());
}

// ── Kanban ───────────────────────────────────────────────────

export const DEFAULT_KANBAN_COLUMNS = [
  { title: 'A Fazer', isCompletionColumn: false },
  { title: 'Em Progresso', isCompletionColumn: false },
  { title: 'Concluído', isCompletionColumn: true },
];

export async function fetchKanbanBoard(taskId: string): Promise<KanbanBoardFull | null> {
  const { data: board, error } = await supabase
    .from('kanban_boards')
    .select('id, task_id, workspace_id, title, created_at, updated_at')
    .eq('task_id', taskId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!board) return null;

  const [columns, cards] = await Promise.all([
    supabase.from('kanban_columns')
      .select('id, board_id, title, order, color, is_completion_column, created_at, updated_at')
      .eq('board_id', board.id).order('order').then(must),
    supabase.from('kanban_cards')
      .select('id, column_id, board_id, title, description, order, assigned_to_id, due_date, labels, created_at, updated_at')
      .eq('board_id', board.id).order('order').then(must),
  ]);

  const byColumn: Record<string, KanbanCard[]> = {};
  for (const col of columns) byColumn[col.id] = [];
  for (const card of cards) (byColumn[card.column_id] ??= []).push(kanbanCardFromRow(card));

  return {
    board: kanbanBoardFromRow(board),
    columns: columns.map(kanbanColumnFromRow),
    cards: byColumn,
  };
}

export async function createKanbanBoard(taskId: string, workspaceId: string, title: string): Promise<void> {
  must(await supabase.rpc('create_kanban_board_with_columns', {
    p_task_id: taskId,
    p_workspace_id: workspaceId,
    p_title: title,
    p_columns: DEFAULT_KANBAN_COLUMNS.map(c => ({
      title: c.title, is_completion_column: c.isCompletionColumn, color: null,
    })) as Json,
  }));
}

export async function createKanbanColumn(boardId: string, title: string, order: number): Promise<void> {
  must(await supabase.from('kanban_columns').insert({ board_id: boardId, title, order }).select('id').single());
}

export async function updateKanbanColumn(
  columnId: string,
  data: Partial<Pick<KanbanColumn, 'title' | 'color' | 'isCompletionColumn'>>,
): Promise<void> {
  must(await supabase.from('kanban_columns').update({
    ...(data.title !== undefined && { title: data.title }),
    ...(data.color !== undefined && { color: data.color }),
    ...(data.isCompletionColumn !== undefined && { is_completion_column: data.isCompletionColumn }),
  }).eq('id', columnId).select('id').single());
}

export async function deleteKanbanColumn(columnId: string): Promise<void> {
  must(await supabase.from('kanban_columns').delete().eq('id', columnId).select('id').single());
}

export async function reorderKanbanColumns(boardId: string, orderedIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_kanban_columns', { p_board_id: boardId, p_column_ids: orderedIds });
  if (error) throw new Error(error.message);
}

export async function createKanbanCard(columnId: string, boardId: string, title: string, order: number): Promise<void> {
  must(await supabase.from('kanban_cards')
    .insert({ column_id: columnId, board_id: boardId, title, order })
    .select('id').single());
}

export type KanbanCardPatch = Partial<Pick<KanbanCard, 'title' | 'description' | 'assignedToId' | 'dueDate' | 'labels'>>;

export async function updateKanbanCard(cardId: string, data: KanbanCardPatch): Promise<void> {
  must(await supabase.from('kanban_cards').update({
    ...(data.title !== undefined && { title: data.title }),
    ...(data.description !== undefined && { description: data.description || null }),
    ...(data.assignedToId !== undefined && { assigned_to_id: data.assignedToId || null }),
    ...(data.dueDate !== undefined && { due_date: data.dueDate || null }),
    ...(data.labels !== undefined && { labels: data.labels }),
  }).eq('id', cardId).select('id').single());
}

export async function deleteKanbanCard(cardId: string): Promise<void> {
  must(await supabase.from('kanban_cards').delete().eq('id', cardId).select('id').single());
}

export async function moveKanbanCard(cardId: string, toColumnId: string, newOrder: number): Promise<void> {
  const { error } = await supabase.rpc('move_kanban_card', { p_card_id: cardId, p_to_column: toColumnId, p_new_order: newOrder });
  if (error) throw new Error(error.message);
}
