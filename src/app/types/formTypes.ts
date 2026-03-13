import { Task } from '../types';

/**
 * Tipo para dados de criação/edição de tarefa
 * Usado em AddTaskModal
 */
export type TaskFormData = {
  text: string;
  isPermanent: boolean;
  date?: string;
  categoryId?: string;
  isDelivery?: boolean;
  deliveryDate?: string;
  recurringType?: 'daily' | 'weekly';
  recurringDays?: number[];
  scheduledTime?: string;
  estimatedDurationMinutes?: number;
  yellowAlertMinutes?: number;
};

/**
 * Tipo para dados de categoria
 * Usado em CategoryModal
 */
export type CategoryFormData = {
  name: string;
  color: string;
};

/**
 * Tipo para dados de membro
 * Usado em MembersModal
 */
export type MemberFormData = {
  name: string;
  email: string;
};

/**
 * Tipo para dados de autenticação
 * Usado em LoginScreen
 */
export type AuthFormData = {
  email: string;
  password: string;
  confirmPassword?: string;
};

/**
 * Tipo do TaskType usado no AddTaskModal
 */
export type TaskType = 'unique' | 'permanent' | 'delivery' | 'weekly';

/**
 * Constantes de dias da semana
 */
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
] as const;

/**
 * Constantes de cores para categorias
 */
export const CATEGORY_COLORS = [
  { name: 'Blue', value: 'bg-blue-500 text-white' },
  { name: 'Orange', value: 'bg-orange-500 text-white' },
  { name: 'Green', value: 'bg-emerald-500 text-white' },
  { name: 'Purple', value: 'bg-purple-500 text-white' },
  { name: 'Rose', value: 'bg-rose-500 text-white' },
  { name: 'Indigo', value: 'bg-indigo-500 text-white' },
  { name: 'Gray', value: 'bg-gray-500 text-white' },
  { name: 'Amber', value: 'bg-amber-500 text-white' },
] as const;

/**
 * Helper types para Task editing
 */
export type TaskForEditing = Pick<Task, 'id' | 'text' | 'isPermanent' | 'categoryId' | 'isDelivery' | 'deliveryDate' | 'recurringType' | 'recurringDays' | 'scheduledTime' | 'estimatedDurationMinutes' | 'yellowAlertMinutes'>;
