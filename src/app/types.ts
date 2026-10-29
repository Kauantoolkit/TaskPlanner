import type { IsoDate } from './domain/tasks';
import type { MemberRole, WorkspaceType } from './lib/database.types';

export type { Task, TaskDraft, TaskKind, IsoDate } from './domain/tasks';
export type { MemberRole, WorkspaceType };

export interface Category {
  id: string;
  name: string;
  color: string;
}

/** Preferências do usuário (iguais em todos os workspaces). */
export interface Preferences {
  darkMode: boolean;
  showCompleted: boolean;
  confirmDelete: boolean;
  sortByTime: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  darkMode: false,
  showCompleted: true,
  confirmDelete: true,
  sortByTime: true,
};

/** Usuário logado. */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

/** Linha de workspace_members. `id` é o que as tarefas referenciam. */
export interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
}

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  ownerId: string;
  /** Visível para membros do workspace; só o dono gera um novo. */
  inviteCode: string | null;
  createdAt: string | null;
}

/** "O que avancei hoje" numa entrega. Um por tarefa por dia. */
export interface DailyLog {
  id: string;
  taskId: string;
  date: IsoDate;
  description: string;
  authorId: string | null;
}

// ── Kanban ───────────────────────────────────────────────────
export interface KanbanBoard {
  id: string;
  taskId: string;
  workspaceId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanColumn {
  id: string;
  boardId: string;
  title: string;
  order: number;
  color?: string;
  isCompletionColumn: boolean;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  boardId: string;
  title: string;
  description?: string;
  order: number;
  assignedToId?: string;
  dueDate?: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KanbanBoardFull {
  board: KanbanBoard;
  columns: KanbanColumn[];
  cards: Record<string, KanbanCard[]>;
}
