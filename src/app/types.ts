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
  
  // Recorrência semanal
  recurringType?: 'daily' | 'weekly'; // 'daily' = todos os dias (same as isPermanent), 'weekly' = dia(s) específico(s) da semana
  recurringDays?: number[]; // Array de dias da semana: 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado
  
  // Sistema de horário e alertas
  scheduledTime?: string; // Horário de início da tarefa (HH:mm)
  estimatedDurationMinutes?: number; // Duração estimada em minutos
  yellowAlertMinutes?: number; // Minutos antes do prazo para alerta amarelo
  startedAt?: string; // Quando a tarefa foi iniciada (ISO timestamp)
  
  // Novo: Campos colaborativos
  assignedToId: string; // ID do usuário responsável
  createdById: string; // ID de quem criou
  workspaceId: string; // ID do workspace
}

export type ViewType = 'today' | 'upcoming' | 'permanent';