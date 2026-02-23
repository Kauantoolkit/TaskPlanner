export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Settings {
  darkMode: boolean;
  showCompleted: boolean;
  confirmDelete: boolean;
}

// Novo: Modelo de Usuário
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'member'; // Owner pode criar tarefas para outros
}

// Novo: Modelo de Workspace (Família/Empresa)
export interface Workspace {
  id: string;
  name: string; // "Família Silva", "Empresa XYZ"
  type: 'family' | 'business' | 'personal';
  ownerId: string;
  memberIds: string[];
  createdAt: string;
}

export interface Task {
  id: string;
  text: string;
  isPermanent: boolean;
  completedDates: string[]; // Store dates as YYYY-MM-DD for permanent tasks
  date?: string; // For specific tasks: YYYY-MM-DD
  completed?: boolean; // For specific tasks
  categoryId?: string;
  isDelivery?: boolean; // For delivery/deadline tasks
  deliveryDate?: string; // Delivery deadline date (YYYY-MM-DD)
  
  // Novo: Campos colaborativos
  assignedToId: string; // ID do usuário responsável
  createdById: string; // ID de quem criou
  workspaceId: string; // ID do workspace
}

export type ViewType = 'today' | 'upcoming' | 'permanent';