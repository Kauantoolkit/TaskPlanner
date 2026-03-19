export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Settings {
  darkMode: boolean;
  showCompleted: boolean;
  confirmDelete: boolean;
  sortByTime: boolean;
}

// Modelo de Usuário
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'member';
}

// Modelo de Workspace
export interface Workspace {
  id: string;
  name: string;
  type: 'family' | 'business' | 'personal';
  ownerId: string;
  memberIds: string[];
  createdAt: string;
  inviteCode?: string;
}

export interface DailyLog {
  date: string;        // yyyy-MM-dd
  description: string;
}

export interface Task {
  id: string;
  text: string;
  isPermanent: boolean;
  completedDates: string[];
  date?: string;
  completed?: boolean;
  categoryId?: string;
  isDelivery?: boolean;
  deliveryDate?: string;
  dailyLogs?: DailyLog[];
  recurringType?: 'daily' | 'weekly';
  recurringDays?: number[];
  scheduledTime?: string;
  estimatedDurationMinutes?: number;
  yellowAlertMinutes?: number;
  startedAt?: string;
  assignedToId: string;
  createdById: string;
  workspaceId: string;
}

// ── Kanban Types ─────────────────────────────────────────────
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

// DND Types
export type SectionId = 'deliveries' | 'weekly' | 'permanent' | 'day';

export type DropResult = {
  taskId: string;
  sectionId: SectionId | null;
  date: string;
};

export type ViewType = 'today' | 'upcoming' | 'permanent';
