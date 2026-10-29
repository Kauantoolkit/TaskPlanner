// Conversão linha do banco (snake_case, null) ↔ modelo do app (camelCase).

import type {
  CategoryRow, KanbanBoardRow, KanbanCardRow, KanbanColumnRow, TaskDailyLogRow,
  TaskRow, UserPreferencesRow, WorkspaceRow,
} from '../lib/database.types';
import { normalizeDraft, type Task, type TaskDraft } from '../domain/tasks';
import type {
  Category, DailyLog, KanbanBoard, KanbanCard, KanbanColumn, Member, Preferences, Workspace,
} from '../types';

/** time do Postgres vem como HH:mm:ss */
const toHHmm = (t: string | null) => (t ? t.slice(0, 5) : null);

export function taskFromRow(r: TaskRow): Task {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    text: r.text,
    kind: r.kind,
    date: r.date,
    deliveryDate: r.delivery_date,
    recurringDays: r.recurring_days ?? [],
    completed: r.completed,
    completedDates: r.completed_dates ?? [],
    categoryId: r.category_id,
    scheduledTime: toHHmm(r.scheduled_time),
    estimatedDurationMinutes: r.estimated_duration_minutes,
    yellowAlertMinutes: r.yellow_alert_minutes,
    startedAt: r.started_at,
    assignedToId: r.assigned_to_id,
    createdById: r.created_by_id,
    createdAt: r.created_at,
  };
}

/** Campos editáveis pelo formulário → colunas. */
export function draftToRow(draft: TaskDraft) {
  const d = normalizeDraft(draft);
  return {
    text: d.text,
    kind: d.kind,
    date: d.date,
    delivery_date: d.deliveryDate,
    recurring_days: d.recurringDays,
    category_id: d.categoryId,
    scheduled_time: d.scheduledTime,
    estimated_duration_minutes: d.estimatedDurationMinutes,
    yellow_alert_minutes: d.yellowAlertMinutes,
    ...(d.assignedToId ? { assigned_to_id: d.assignedToId } : {}),
  };
}

/** Patch parcial do modelo → colunas (só o que veio). */
export function taskPatchToRow(patch: Partial<Task>): Partial<TaskRow> {
  const row: Partial<TaskRow> = {};
  if (patch.text !== undefined) row.text = patch.text;
  if (patch.completed !== undefined) row.completed = patch.completed;
  if (patch.completedDates !== undefined) row.completed_dates = patch.completedDates;
  if (patch.categoryId !== undefined) row.category_id = patch.categoryId;
  if (patch.assignedToId !== undefined) row.assigned_to_id = patch.assignedToId;
  if (patch.startedAt !== undefined) row.started_at = patch.startedAt;
  return row;
}

export const categoryFromRow = (r: CategoryRow): Category => ({ id: r.id, name: r.name, color: r.color });

export const workspaceFromRow = (r: Pick<WorkspaceRow, 'id' | 'name' | 'type' | 'owner_id' | 'invite_code' | 'created_at'>): Workspace => ({
  id: r.id,
  name: r.name,
  type: r.type,
  ownerId: r.owner_id,
  inviteCode: r.invite_code,
  createdAt: r.created_at,
});

export const memberFromRow = (r: { id: string; user_id: string; name: string; email: string; role: Member['role'] }): Member => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  email: r.email,
  role: r.role,
});

export const dailyLogFromRow = (r: TaskDailyLogRow): DailyLog => ({
  id: r.id,
  taskId: r.task_id,
  date: r.log_date,
  description: r.description,
  authorId: r.author_id,
});

export const preferencesFromRow = (r: UserPreferencesRow): Preferences => ({
  darkMode: r.dark_mode,
  showCompleted: r.show_completed,
  confirmDelete: r.confirm_delete,
  sortByTime: r.sort_by_time,
});

export const preferencesToRow = (p: Preferences) => ({
  dark_mode: p.darkMode,
  show_completed: p.showCompleted,
  confirm_delete: p.confirmDelete,
  sort_by_time: p.sortByTime,
});

export const kanbanBoardFromRow = (r: KanbanBoardRow): KanbanBoard => ({
  id: r.id,
  taskId: r.task_id,
  workspaceId: r.workspace_id,
  title: r.title,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const kanbanColumnFromRow = (r: KanbanColumnRow): KanbanColumn => ({
  id: r.id,
  boardId: r.board_id,
  title: r.title,
  order: r.order,
  color: r.color ?? undefined,
  isCompletionColumn: r.is_completion_column,
});

export const kanbanCardFromRow = (r: KanbanCardRow): KanbanCard => ({
  id: r.id,
  columnId: r.column_id,
  boardId: r.board_id,
  title: r.title,
  description: r.description ?? undefined,
  order: r.order,
  assignedToId: r.assigned_to_id ?? undefined,
  dueDate: r.due_date ?? undefined,
  labels: r.labels ?? [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
