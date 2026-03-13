import React, { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { format, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Calendar as CalendarIcon, ListTodo, PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Task, Category } from '../types';
import { TaskItem } from './TaskItem';
import { motion as Motion, AnimatePresence } from 'motion/react';

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

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  categories,
  selectedDate,
  onDateChange,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  onEditTask
}) => {
  const [calendarMonth, setCalendarMonth] = useState<Date>(selectedDate);

  // Sync calendar month when selected date changes
  React.useEffect(() => {
    setCalendarMonth(selectedDate);
  }, [selectedDate]);

  const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
  const currentDayOfWeek = selectedDate.getDay();

  // Filter tasks for selected day
  const dayTasks = tasks.filter(task => {
    if (task.isPermanent) return true;

    if (task.recurringType === 'weekly' && task.recurringDays && task.recurringDays.length > 0) {
      return task.recurringDays.includes(currentDayOfWeek);
    }

    if (task.isDelivery && task.deliveryDate) {
      const today = format(new Date(), 'yyyy-MM-dd');
      return formattedSelectedDate >= today && formattedSelectedDate <= task.deliveryDate;
    }

    return task.date === formattedSelectedDate;
  });

  // Task count per day for the current month
  const getTaskCountForDate = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();

    return tasks.filter(t => {
      if (t.isPermanent) return true;

      if (t.recurringType === 'weekly' && t.recurringDays && t.recurringDays.length > 0) {
        return t.recurringDays.includes(dayOfWeek);
      }

      if (t.isDelivery && t.deliveryDate) {
        return dateStr <= t.deliveryDate;
      }

      return t.date === dateStr;
    }).length;
  };

  const modifiers = {
    hasTask: (date: Date) => getTaskCountForDate(date) > 0
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-950 dark:to-blue-950/20">
      {/* Header */}
      <header className="p-4 md:p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl md:rounded-2xl shadow-lg">
              <CalendarIcon className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-black text-gray-900 dark:text-gray-100">
                Visualização Mensal
              </h2>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-semibold">
                {format(calendarMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          <button
            onClick={onAddTask}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs md:text-sm font-black px-3 md:px-5 py-2 md:py-3 rounded-xl md:rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <PlusCircle size={16} strokeWidth={3} />
            <span className="hidden md:inline">NOVA TAREFA</span>
            <span className="md:hidden">NOVA</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-0 lg:gap-6 p-4 md:p-6">
          {/* Calendar Section */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 p-4 md:p-8 flex flex-col">
            <style>{`
              .calendar-custom {
                width: 100%;
              }
              .calendar-custom .rdp {
                --rdp-cell-size: clamp(40px, 8vw, 60px);
                --rdp-accent-color: #2563eb;
                margin: 0;
                width: 100%;
              }
              .calendar-custom .rdp-months {
                width: 100%;
                justify-content: center;
              }
              .calendar-custom .rdp-table {
                width: 100%;
                max-width: none;
              }
              .calendar-custom .rdp-caption {
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 1rem 0 2rem 0;
              }
              .calendar-custom .rdp-caption_label {
                font-size: 1.25rem;
                font-weight: 900;
                color: #1f2937;
              }
              .calendar-custom .dark .rdp-caption_label {
                color: #f3f4f6;
              }
              .calendar-custom .rdp-head_cell {
                font-size: 0.75rem;
                font-weight: 700;
                color: #6b7280;
                text-transform: uppercase;
                padding: 0.5rem 0;
              }
              .calendar-custom .dark .rdp-head_cell {
                color: #9ca3af;
              }
              .calendar-custom .rdp-cell {
                padding: 2px;
              }
              .calendar-custom .rdp-day {
                border-radius: 14px;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                font-weight: 600;
                font-size: 0.875rem;
                position: relative;
              }
              .calendar-custom .rdp-day_selected {
                background: linear-gradient(135deg, #2563eb, #7c3aed) !important;
                color: white !important;
                font-weight: 900 !important;
                box-shadow: 0 10px 30px -5px rgba(37, 99, 235, 0.5);
                transform: scale(1.05);
              }
              .calendar-custom .rdp-day_today:not(.rdp-day_selected) {
                background-color: #dbeafe;
                color: #2563eb;
                font-weight: 900;
                box-shadow: 0 0 0 2px #93c5fd;
              }
              .calendar-custom .dark .rdp-day_today:not(.rdp-day_selected) {
                background-color: rgba(37, 99, 235, 0.2);
                color: #60a5fa;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4);
              }
              .calendar-custom .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
                background-color: #f3f4f6;
                transform: scale(1.03);
              }
              .calendar-custom .dark .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
                background-color: #374151;
              }
              .calendar-custom .rdp-day.has-task-dot::before {
                content: attr(data-task-count);
                position: absolute;
                top: 4px;
                right: 4px;
                width: 18px;
                height: 18px;
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                color: white;
                border-radius: 50%;
                font-size: 10px;
                font-weight: 900;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
                z-index: 10;
              }
              .calendar-custom .rdp-day_selected.has-task-dot::before {
                background: white;
                color: #2563eb;
              }
              .calendar-custom .rdp-day[disabled] {
                opacity: 0.3;
              }
              .calendar-custom .dark .rdp-day {
                color: #e5e7eb;
              }
            `}</style>

            <div className="calendar-custom flex-1 flex items-center justify-center">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && onDateChange(date)}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                locale={ptBR}
                modifiers={modifiers}
                modifiersClassNames={{
                  hasTask: 'has-task-dot'
                }}
                components={{
                  Day: ({ ...props }) => {
                    const count = getTaskCountForDate(props.date);
                    return (
                      <button
                        {...props}
                        data-task-count={count}
                        className={props.className}
                      />
                    );
                  }
                }}
              />
            </div>

            {/* Legend */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                <div className="w-3 h-3 rounded-full bg-blue-600 ring-2 ring-blue-200 dark:ring-blue-800" />
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Hoje</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-600 to-purple-600" />
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">Selecionado</span>
              </div>
            </div>
          </div>

          {/* Tasks Sidebar */}
          <div className="hidden lg:flex flex-col bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600">
              <p className="text-xs font-black text-blue-100 uppercase tracking-wider mb-1">
                {format(selectedDate, "EEEE", { locale: ptBR })}
              </p>
              <h3 className="text-2xl font-black text-white">
                {format(selectedDate, "dd 'de' MMM", { locale: ptBR })}
              </h3>
              <div className="mt-3 flex items-center gap-2 text-white/90 text-sm font-bold">
                <ListTodo size={16} />
                <span>{dayTasks.length} {dayTasks.length === 1 ? 'tarefa' : 'tarefas'}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence mode="popLayout">
                {dayTasks.length > 0 ? (
                  dayTasks.map((task) => (
                    <Motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <TaskItem
                        task={{
                          ...task,
                          completed: task.isPermanent || task.recurringType === 'weekly'
                            ? task.completedDates.includes(formattedSelectedDate)
                            : !!task.completed
                        }}
                        category={categories.find(c => c.id === task.categoryId)}
                        onToggle={(id) => onToggleTask(id, formattedSelectedDate)}
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
                    className="flex flex-col items-center justify-center h-full text-center py-12"
                  >
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                      <ListTodo size={32} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-bold text-gray-400 mb-2">Nenhuma tarefa</p>
                    <button
                      onClick={onAddTask}
                      className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                    >
                      Adicionar tarefa +
                    </button>
                  </Motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tasks List */}
      <div className="lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 max-h-[40vh] overflow-y-auto">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
              {format(selectedDate, "EEEE", { locale: ptBR })}
            </p>
            <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">
              {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </h3>
          </div>
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {dayTasks.length} {dayTasks.length === 1 ? 'tarefa' : 'tarefas'}
          </div>
        </div>

        <div className="space-y-2">
          {dayTasks.length > 0 ? (
            dayTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={{
                  ...task,
                  completed: task.isPermanent || task.recurringType === 'weekly'
                    ? task.completedDates.includes(formattedSelectedDate)
                    : !!task.completed
                }}
                category={categories.find(c => c.id === task.categoryId)}
                onToggle={(id) => onToggleTask(id, formattedSelectedDate)}
                onDelete={onDeleteTask}
                onEdit={onEditTask}
                selectedDate={formattedSelectedDate}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-sm font-bold text-gray-400">Nenhuma tarefa para este dia</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
