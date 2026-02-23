import { Task, Category, Settings } from '../types';

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
}
