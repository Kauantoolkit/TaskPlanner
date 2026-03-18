import { Task, Category, Settings, KanbanBoard, KanbanBoardFull, KanbanColumn, KanbanCard } from '../types';

/**
 * Interface para o repositório de dados
 * Implementações: LocalStorageRepository (atual) e PostgresRepository (futura)
 */
export interface IDataRepository {
  // Tasks
  getTasks(): Promise<Task[]>;
  createTask(task: Task): Promise<Task>;
  updateTask(id: string, task: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: Category): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  
  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(settings: Settings): Promise<Settings>;
  
  // Bulk operations
  clearAll(): Promise<void>;

  // ── Kanban ──────────────────────────────────────────────────
  getKanbanBoard(taskId: string): Promise<KanbanBoardFull | null>;
  createKanbanBoard(
    taskId: string,
    workspaceId: string,
    title: string,
    defaultColumns?: Array<{ title: string; isCompletionColumn?: boolean; color?: string }>
  ): Promise<KanbanBoard>;
  deleteKanbanBoard(boardId: string): Promise<void>;

  // Colunas
  createKanbanColumn(boardId: string, title: string, order: number, opts?: Partial<KanbanColumn>): Promise<KanbanColumn>;
  updateKanbanColumn(columnId: string, data: Partial<Pick<KanbanColumn, 'title' | 'order' | 'color' | 'isCompletionColumn'>>): Promise<void>;
  deleteKanbanColumn(columnId: string): Promise<void>;
  reorderKanbanColumns(boardId: string, orderedColumnIds: string[]): Promise<void>;

  // Cards
  createKanbanCard(columnId: string, boardId: string, title: string, opts?: Partial<KanbanCard>): Promise<KanbanCard>;
  updateKanbanCard(cardId: string, data: Partial<Pick<KanbanCard, 'title' | 'description' | 'order' | 'assignedToId' | 'dueDate' | 'labels'>>): Promise<void>;
  deleteKanbanCard(cardId: string): Promise<void>;
  moveKanbanCard(cardId: string, toColumnId: string, newOrder: number): Promise<void>;
  reorderKanbanCards(columnId: string, orderedCardIds: string[]): Promise<void>;
}
