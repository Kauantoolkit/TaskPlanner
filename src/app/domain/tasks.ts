// Regras de negócio das tarefas, sem React e sem Supabase.
// Tudo que decide "a tarefa aparece neste dia?", "está feita?", "está
// atrasada?" mora aqui e é coberto por tasks.test.ts.

import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { TaskKind } from '../lib/database.types';

export type { TaskKind };

/** Data de calendário no formato yyyy-MM-dd, sempre no fuso local. */
export type IsoDate = string;

export interface Task {
  id: string;
  workspaceId: string;
  text: string;
  kind: TaskKind;
  /** Só em 'once'. */
  date: IsoDate | null;
  /** Só em 'delivery'. */
  deliveryDate: IsoDate | null;
  /** Só em 'weekly'. 0 = domingo … 6 = sábado. */
  recurringDays: number[];
  /** Conclusão de 'once'. */
  completed: boolean;
  /** Conclusão de 'daily' e 'weekly', dia a dia. */
  completedDates: IsoDate[];
  categoryId: string | null;
  /** HH:mm */
  scheduledTime: string | null;
  estimatedDurationMinutes: number | null;
  yellowAlertMinutes: number | null;
  startedAt: string | null;
  /** workspace_members.id */
  assignedToId: string;
  /** workspace_members.id */
  createdById: string;
  createdAt: string | null;
}

/** Campos que o formulário de tarefa define. */
export type TaskDraft = Pick<
  Task,
  'text' | 'kind' | 'date' | 'deliveryDate' | 'recurringDays' | 'categoryId' |
  'scheduledTime' | 'estimatedDurationMinutes' | 'yellowAlertMinutes'
> & { assignedToId?: string };

export const TASK_KIND_LABEL: Record<TaskKind, string> = {
  once: 'Única',
  daily: 'Todo dia',
  weekly: 'Semanal',
  delivery: 'Entrega',
};

/** Duração assumida quando a tarefa tem horário mas não tem duração. */
export const DEFAULT_DURATION_MINUTES = 240;

export function toIsoDate(date: Date): IsoDate {
  return format(date, 'yyyy-MM-dd');
}

export function weekdayOf(day: IsoDate): number {
  return parseISO(day).getDay();
}

export function isRecurring(task: Pick<Task, 'kind'>): boolean {
  return task.kind === 'daily' || task.kind === 'weekly';
}

/** A tarefa aparece no planner deste dia? */
export function occursOn(task: Task, day: IsoDate): boolean {
  switch (task.kind) {
    case 'once':
      return task.date === day;
    case 'daily':
      return true;
    case 'weekly':
      return task.recurringDays.includes(weekdayOf(day));
    case 'delivery':
      // Aparece todos os dias até o prazo, inclusive
      return task.deliveryDate !== null && day <= task.deliveryDate;
  }
}

/** Entregas não são "concluídas": o progresso delas é o kanban e os logs diários. */
export function isCompletable(task: Pick<Task, 'kind'>): boolean {
  return task.kind !== 'delivery';
}

export function isDoneOn(task: Task, day: IsoDate): boolean {
  if (isRecurring(task)) return task.completedDates.includes(day);
  if (task.kind === 'once') return task.completed;
  return false;
}

/** Patch a gravar para alternar a conclusão no dia. null quando o tipo não tem conclusão. */
export function toggleDonePatch(task: Task, day: IsoDate): Pick<Task, 'completed'> | Pick<Task, 'completedDates'> | null {
  if (!isCompletable(task)) return null;
  if (isRecurring(task)) {
    const done = task.completedDates.includes(day);
    return {
      completedDates: done
        ? task.completedDates.filter(d => d !== day)
        : [...task.completedDates, day].sort(),
    };
  }
  return { completed: !task.completed };
}

export interface DayFilter {
  search?: string;
  sortByTime?: boolean;
  showCompleted?: boolean;
}

/** Tarefas do dia, filtradas e ordenadas como o planner mostra. */
export function tasksForDay(tasks: Task[], day: IsoDate, filter: DayFilter = {}): Task[] {
  const search = filter.search?.trim().toLowerCase() ?? '';
  const list = tasks.filter(task =>
    occursOn(task, day)
    && (search === '' || task.text.toLowerCase().includes(search))
    && (filter.showCompleted !== false || !isDoneOn(task, day)),
  );
  if (filter.sortByTime === false) return list;
  // Sem horário vai para o fim; empate mantém a ordem original (sort é estável)
  return [...list].sort((a, b) => (a.scheduledTime ?? '99:99').localeCompare(b.scheduledTime ?? '99:99'));
}

export interface DayProgress {
  total: number;
  completed: number;
  percentage: number;
}

/** Progresso do dia. Entregas ficam de fora: duram vários dias. */
export function dayProgress(tasks: Task[], day: IsoDate): DayProgress {
  const daily = tasks.filter(t => occursOn(t, day) && isCompletable(t));
  const completed = daily.filter(t => isDoneOn(t, day)).length;
  return {
    total: daily.length,
    completed,
    percentage: daily.length > 0 ? Math.round((completed / daily.length) * 100) : 0,
  };
}

/** Dias corridos do dia visto até o prazo. null se não for entrega. */
export function daysUntilDelivery(task: Task, day: IsoDate): number | null {
  if (task.kind !== 'delivery' || !task.deliveryDate) return null;
  return differenceInCalendarDays(parseISO(task.deliveryDate), parseISO(day));
}

export type DeliveryUrgency = 'today' | 'soon' | 'normal';

/** Hoje = vermelho, até 3 dias = laranja, resto = verde. */
export function deliveryUrgency(task: Task, day: IsoDate): DeliveryUrgency | null {
  const days = daysUntilDelivery(task, day);
  if (days === null) return null;
  if (days <= 0) return 'today';
  if (days <= 3) return 'soon';
  return 'normal';
}

export type TimeStatus = 'normal' | 'yellow' | 'red';

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Alerta de horário, só para o dia de hoje:
 * vermelho depois do fim previsto (início + duração), amarelo a partir de
 * `yellowAlertMinutes` antes do fim (padrão: metade da duração).
 */
export function timeStatus(task: Task, day: IsoDate, now: Date): TimeStatus {
  if (!task.scheduledTime || task.kind === 'delivery') return 'normal';
  if (isDoneOn(task, day) || day !== toIsoDate(now)) return 'normal';

  const start = minutesOf(task.scheduledTime);
  const duration = task.estimatedDurationMinutes ?? DEFAULT_DURATION_MINUTES;
  const yellowBefore = task.yellowAlertMinutes ?? Math.floor(duration / 2);
  const end = start + duration;
  const current = now.getHours() * 60 + now.getMinutes();

  if (current < start) return 'normal';
  if (current >= end) return 'red';
  if (current >= end - yellowBefore) return 'yellow';
  return 'normal';
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/**
 * Normaliza um rascunho para o tipo escolhido: limpa os campos que não
 * pertencem a ele (o banco rejeita combinações inválidas).
 */
export function normalizeDraft(draft: TaskDraft): TaskDraft {
  return {
    ...draft,
    text: draft.text.trim(),
    date: draft.kind === 'once' ? draft.date : null,
    deliveryDate: draft.kind === 'delivery' ? draft.deliveryDate : null,
    recurringDays: draft.kind === 'weekly' ? [...new Set(draft.recurringDays)].sort((a, b) => a - b) : [],
  };
}
