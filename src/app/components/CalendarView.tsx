import React, { useState, useMemo, useCallback } from 'react';
import { DayPicker, DayContentProps } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { format, isToday } from 'date-fns';
import { Plus, ListTodo, Clock, Target, Repeat, Calendar } from 'lucide-react';
import { Task, Category } from '../types';
import { TaskItem } from './TaskItem';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CalendarViewProps {
  tasks: Task[];
  categories: Category[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onToggleTask: (id: string, date: string) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: () => void;
  onEditTask?: (id: string) => void;
}

// ─── pure helpers ──────────────────────────────────────────────────────────────

// Todas as tarefas visíveis num dia (para o painel lateral)
function getTasksForDate(tasks: Task[], date: Date): Task[] {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dow = date.getDay();
  return tasks.filter(t => {
    if (t.isPermanent) return true;
    if (t.recurringType === 'weekly' && t.recurringDays?.includes(dow)) return true;
    if (t.isDelivery && t.deliveryDate) return dateStr <= t.deliveryDate;
    return t.date === dateStr;
  });
}

// Tarefas que geram bolinha no calendário — exclui permanentes
// (aparecem todo dia e não carregam informação diferencial)
function getSignificantTasksForDate(tasks: Task[], date: Date): Task[] {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dow = date.getDay();
  return tasks.filter(t => {
    if (t.isPermanent) return false;
    if (t.recurringType === 'weekly' && t.recurringDays?.includes(dow)) return true;
    if (t.isDelivery && t.deliveryDate) return dateStr <= t.deliveryDate;
    return t.date === dateStr;
  });
}

function isTaskDoneOnDate(task: Task, dateStr: string): boolean {
  if (task.isPermanent || task.recurringType === 'weekly') {
    return task.completedDates.includes(dateStr);
  }
  return !!task.completed;
}

function sortByTime(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const tA = a.scheduledTime || '23:59';
    const tB = b.scheduledTime || '23:59';
    return tA.localeCompare(tB);
  });
}

// ─── calendar CSS ──────────────────────────────────────────────────────────────

const CALENDAR_CSS = `
  .cv .rdp { margin: 0; width: 100%; }
  .cv .rdp-months { width: 100%; justify-content: center; }
  .cv .rdp-month { width: 100%; }
  .cv .rdp-table { width: 100%; max-width: none; border-collapse: separate; border-spacing: 3px; }
  .cv .rdp-caption { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; padding: 0; }
  .cv .rdp-caption_label { font-size: 1rem; font-weight: 900; color: #111827; text-transform: capitalize; letter-spacing: -0.02em; }
  .dark .cv .rdp-caption_label { color: #f9fafb; }
  .cv .rdp-nav { display: flex; gap: 2px; }
  .cv .rdp-nav_button { width: 32px; height: 32px; border-radius: 8px; color: #6b7280; transition: background 0.12s; display: flex; align-items: center; justify-content: center; }
  .cv .rdp-nav_button:hover:not([disabled]) { background: #f3f4f6; color: #111827; }
  .dark .cv .rdp-nav_button { color: #9ca3af; }
  .dark .cv .rdp-nav_button:hover:not([disabled]) { background: #374151; color: #f9fafb; }
  .cv .rdp-head_row { display: grid; grid-template-columns: repeat(7, 1fr); }
  .cv .rdp-head_cell { font-size: 0.65rem; font-weight: 800; color: #d1d5db; text-transform: uppercase; text-align: center; padding: 0.25rem 0 0.75rem; }
  .dark .cv .rdp-head_cell { color: #4b5563; }
  .cv .rdp-tbody tr { display: grid; grid-template-columns: repeat(7, 1fr); }
  .cv .rdp-cell { padding: 1px; }
  .cv .rdp-day {
    width: 100%; border-radius: 10px; font-weight: 600; font-size: 0.8rem;
    color: #374151; transition: all 0.12s; padding: 6px 2px;
    min-height: 48px; display: flex; align-items: center; justify-content: center;
    border: 2px solid transparent;
  }
  .cv .rdp-day:hover:not([disabled]):not(.rdp-day_selected) { background: #f9fafb; border-color: #e5e7eb; }
  .dark .cv .rdp-day { color: #d1d5db; }
  .dark .cv .rdp-day:hover:not([disabled]):not(.rdp-day_selected) { background: #1f2937; border-color: #374151; }
  .cv .rdp-day_selected { background: #2563eb !important; color: #fff !important; font-weight: 900 !important; border-color: #2563eb !important; box-shadow: 0 2px 12px rgba(37,99,235,0.35); }
  .cv .rdp-day_today:not(.rdp-day_selected) { background: #eff6ff; color: #2563eb; font-weight: 900; border-color: #bfdbfe; }
  .dark .cv .rdp-day_today:not(.rdp-day_selected) { background: rgba(37,99,235,0.1); color: #60a5fa; border-color: rgba(59,130,246,0.25); }
  .cv .rdp-day_outside { opacity: 0.2; }
  .cv .rdp-day_disabled { opacity: 0.15; cursor: not-allowed; }
`;

// ─── component ─────────────────────────────────────────────────────────────────

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  categories,
  selectedDate,
  onDateChange,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  onEditTask,
}) => {
  const [calendarMonth, setCalendarMonth] = useState<Date>(selectedDate);

  React.useEffect(() => {
    setCalendarMonth(selectedDate);
  }, [selectedDate]);

  const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');

  // Tasks for selected day sorted by time
  const dayTasks = useMemo(
    () => sortByTime(getTasksForDate(tasks, selectedDate)),
    [tasks, selectedDate]
  );

  // Progress stats for selected day
  const stats = useMemo(() => {
    const done = dayTasks.filter(t => isTaskDoneOnDate(t, formattedSelectedDate)).length;
    const total = dayTasks.length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [dayTasks, formattedSelectedDate]);

  // Custom day content — shows dot indicator below the day number
  const DayContent = useCallback((props: DayContentProps) => {
    const { date } = props;
    const ts = getSignificantTasksForDate(tasks, date);
    const ds = format(date, 'yyyy-MM-dd');

    if (ts.length === 0) {
      return <span className="leading-none">{format(date, 'd')}</span>;
    }

    const done = ts.filter(t => isTaskDoneOnDate(t, ds)).length;
    const allDone = done === ts.length;
    const someDone = done > 0 && !allDone;

    return (
      <div className="flex flex-col items-center gap-[3px]">
        <span className="leading-none">{format(date, 'd')}</span>
        <span className={cn(
          'block w-1.5 h-1.5 rounded-full flex-shrink-0',
          allDone  ? 'bg-green-500' :
          someDone ? 'bg-yellow-400' :
                     'bg-blue-500'
        )} />
      </div>
    );
  }, [tasks]);

  return (
    <div className="flex flex-col lg:flex-row lg:h-full bg-[#fafafa] dark:bg-gray-950">
      <style>{CALENDAR_CSS}</style>

      {/* ── Calendar ─────────────────────────────────────────── */}
      <div className="flex-1 p-4 md:p-8 lg:overflow-y-auto">
        <div className="cv">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={date => date && onDateChange(date)}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            locale={ptBR}
            components={{ DayContent }}
          />
        </div>

        {/* Legenda */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-3 text-xs font-bold">
          <span className="flex items-center gap-1.5 text-gray-400">
            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            Tarefas pendentes
          </span>
          <span className="flex items-center gap-1.5 text-gray-400">
            <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
            Parcialmente concluído
          </span>
          <span className="flex items-center gap-1.5 text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            Tudo concluído
          </span>
        </div>
      </div>

      {/* ── Task panel ───────────────────────────────────────── */}
      <div className={cn(
        'bg-white dark:bg-gray-900',
        'border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-800',
        'lg:w-[400px] lg:shrink-0 lg:flex lg:flex-col lg:overflow-hidden'
      )}>

        {/* Panel header */}
        <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800 lg:shrink-0">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.18em] mb-0.5 capitalize truncate">
                {format(selectedDate, 'EEEE', { locale: ptBR })}
                {isToday(selectedDate) && (
                  <span className="ml-1.5 text-blue-500">— hoje</span>
                )}
              </p>
              <h3 className="text-lg font-black text-gray-800 dark:text-gray-100 tracking-tight">
                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </h3>
            </div>

            <button
              onClick={onAddTask}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black px-3 py-2 rounded-xl transition-all shrink-0 min-h-[36px] min-w-[36px]"
              aria-label="Nova tarefa"
            >
              <Plus size={14} strokeWidth={3} />
              <span className="hidden sm:inline">NOVA</span>
            </button>
          </div>

          {/* Progress */}
          {stats.total > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-gray-400">
                  {stats.done}/{stats.total} {stats.done === 1 ? 'concluída' : 'concluídas'}
                </span>
                <span className="text-xs font-black text-blue-600">{stats.pct}%</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500 ease-out',
                    stats.pct === 100 ? 'bg-green-500' : 'bg-blue-600'
                  )}
                  style={{ width: `${stats.pct}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-300 dark:text-gray-600 font-bold">
              Nenhuma tarefa neste dia
            </p>
          )}
        </div>

        {/* Task list */}
        <div className="lg:flex-1 lg:overflow-y-auto p-4 space-y-2">
          <AnimatePresence mode="popLayout">
            {dayTasks.length > 0 ? (
              dayTasks.map(task => (
                <Motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                >
                  <TaskItem
                    task={{
                      ...task,
                      completed: isTaskDoneOnDate(task, formattedSelectedDate),
                    }}
                    category={categories.find(c => c.id === task.categoryId)}
                    onToggle={id => onToggleTask(id, formattedSelectedDate)}
                    onDelete={onDeleteTask}
                    onEdit={onEditTask}
                    selectedDate={formattedSelectedDate}
                  />
                </Motion.div>
              ))
            ) : (
              <Motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-3">
                  <ListTodo size={22} className="text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-sm font-bold text-gray-400 mb-3">Dia livre!</p>
                <button
                  onClick={onAddTask}
                  className="text-xs text-blue-600 dark:text-blue-400 font-black hover:underline flex items-center gap-1 min-h-[32px]"
                >
                  <Plus size={12} strokeWidth={3} />
                  Adicionar tarefa
                </button>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
