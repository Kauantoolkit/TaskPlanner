import { z } from 'zod';

// Schema para AddTaskModal
export const addTaskSchema = z.object({
  text: z.string()
    .min(1, 'O texto da tarefa é obrigatório')
    .max(500, 'O texto não pode ter mais de 500 caracteres')
    .trim(),
  categoryId: z.string().optional(),
  taskType: z.enum(['unique', 'permanent', 'delivery', 'weekly']),
  deliveryDate: z.string().optional(),
  recurringDays: z.array(z.number().min(0).max(6)).optional(),
  scheduledTime: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido')
    .default('09:00'),
  estimatedDurationMinutes: z.number()
    .min(15, 'Duração mínima: 15 minutos')
    .max(720, 'Duração máxima: 12 horas'),
  yellowAlertMinutes: z.number()
    .min(5, 'Alerta mínimo: 5 minutos')
    .max(360, 'Alerta máximo: 6 horas')
}).refine((data) => {
  // Se for delivery, deliveryDate é obrigatório
  if (data.taskType === 'delivery') {
    return !!data.deliveryDate;
  }
  return true;
}, {
  message: 'Data de entrega é obrigatória para tarefas do tipo entrega',
  path: ['deliveryDate']
}).refine((data) => {
  // Se for weekly, recurringDays é obrigatório
  if (data.taskType === 'weekly') {
    return data.recurringDays && data.recurringDays.length > 0;
  }
  return true;
}, {
  message: 'Selecione pelo menos um dia da semana',
  path: ['recurringDays']
});

export type AddTaskFormData = z.infer<typeof addTaskSchema>;

// Schema para CategoryModal
export const categorySchema = z.object({
  name: z.string()
    .min(1, 'O nome da categoria é obrigatório')
    .max(50, 'O nome não pode ter mais de 50 caracteres')
    .trim(),
  color: z.string()
    .min(1, 'Selecione uma cor')
});

export type CategoryFormData = z.infer<typeof categorySchema>;

// Schema para MembersModal
export const memberSchema = z.object({
  name: z.string()
    .min(1, 'O nome é obrigatório')
    .max(100, 'O nome não pode ter mais de 100 caracteres')
    .trim(),
  email: z.string()
    .min(1, 'O email é obrigatório')
    .email('Digite um email válido')
    .max(255, 'O email não pode ter mais de 255 caracteres')
    .toLowerCase()
    .trim()
});

export type MemberFormData = z.infer<typeof memberSchema>;

// Schema para LoginScreen (Sign In)
export const signInSchema = z.object({
  email: z.string()
    .min(1, 'O email é obrigatório')
    .email('Digite um email válido')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(6, 'A senha deve ter pelo menos 6 caracteres')
    .max(100, 'A senha não pode ter mais de 100 caracteres')
});

export type SignInFormData = z.infer<typeof signInSchema>;

// Schema para LoginScreen (Sign Up)
export const signUpSchema = z.object({
  email: z.string()
    .min(1, 'O email é obrigatório')
    .email('Digite um email válido')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(6, 'A senha deve ter pelo menos 6 caracteres')
    .max(100, 'A senha não pode ter mais de 100 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword']
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
