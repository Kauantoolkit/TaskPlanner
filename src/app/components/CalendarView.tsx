import React, { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { format, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ListTodo, PlusCircle, CheckCircle2, Circle } from 'lucide-react';
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
  const [activeSection, setActiveSection] = useState<'calendar' | 'tasks'>('calendar');

  // Sincroniza o mês do calendário quando a data selecionada muda via Sidebar
  React.useEffect(() => {
    setCalendarMonth(selectedDate);
  }, [selectedDate]);

  // Função para alternar seção em mobile
  const toggleSection = (section: 'calendar' | 'tasks') => {
    setActiveSection(section);
  };

  const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');

  // Filtra tarefas para o dia selecionado no calendário
  const dayTasks = tasks.filter(task => {
    if (task.isPermanent) return true;
    
    // Delivery tasks show from today until delivery date
    if (task.isDelivery && task.deliveryDate) {
      const today = format(new Date(), 'yyyy-MM-dd');
      return formattedSelectedDate >= today && formattedSelectedDate <= task.deliveryDate;
    }
    
    return task.date === formattedSelectedDate;
  });

  const modifiers = {
    hasTask: (date: Date) => tasks.some(t => {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      if (t.isPermanent) return true;
      
      // For delivery tasks, only mark the delivery date itself
      if (t.isDelivery && t.deliveryDate) {
        return dateStr === t.deliveryDate;
      }
      
      return t.date === dateStr;
    })
  };

  const modifiersStyles = {
    hasTask: {
      fontWeight: 'bold',
      position: 'relative' as const,
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full animate-in fade-in duration-500">
      {/* Botões de navegação mobile */}
      <div className="flex md:hidden border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <button
          onClick={() => toggleSection('calendar')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${
            activeSection === 'calendar' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-950/20' 
              : 'text-gray-400'
          }`}
        >
          <CalendarIcon size={18} /> Calendário
        </button>
        <button
          onClick={() => toggleSection('tasks')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${
            activeSection === 'tasks' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-950/20' 
              : 'text-gray-400'
          }`}
        >
          <ListTodo size={18} /> Tarefas
        </button>
      </div>

      {/* Lado Esquerdo: Calendário */}
      <div className={`w-full md:w-[450px] border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col p-4 md:p-8 ${activeSection === 'tasks' ? 'hidden md:flex' : 'flex'}`}>
        <header className="mb-4 md:mb-8">
          <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-gray-100 flex items-center gap-2 md:gap-3 tracking-tight">
            <CalendarIcon className="text-blue-600" size={24} /> Calendário
          </h2>
          <p className="text-gray-400 font-medium text-sm mt-1 hidden md:block">Navegue pelas suas datas e compromissos</p>
        </header>

        <div className="flex-1 flex flex-col items-center">
          <style>{`
            .rdp {
              --rdp-cell-size: 48px;
              --rdp-accent-color: #2563eb;
              --rdp-background-color: #eff6ff;
              margin: 0;
              width: 100%;
            }
            @media (max-width: 768px) {
              .rdp {
                --rdp-cell-size: 40px;
              }
            }
            .rdp-months { width: 100%; justify-content: center; }
            .rdp-table { max-width: none; width: 100%; }
            .rdp-caption_label {
              font-weight: 900;
              font-size: 1.25rem;
              color: #1f2937;
            }
            .rdp-head_cell {
              color: #6b7280;
              font-weight: 700;
              font-size: 0.875rem;
            }
            .rdp-day_selected {
              background-color: var(--rdp-accent-color) !important;
              color: white !important;
              font-weight: 900 !important;
              border-radius: 12px !important;
              box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.4);
              transform: scale(1.05);
            }
            .rdp-day {
              border-radius: 12px;
              transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
              font-weight: 600;
            }
            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
              background-color: var(--rdp-background-color);
              transform: scale(1.02);
            }
            .rdp-button:active:not([disabled]) {
              transform: scale(0.98);
            }
            .rdp-day_today:not(.rdp-day_selected) {
              font-weight: 900;
              color: #2563eb;
              background-color: #dbeafe;
            }
            .dark .rdp-day { color: #e5e7eb; }
            .dark .rdp-month { color: #f3f4f6; }
            .dark .rdp-caption_label { color: #f3f4f6; }
            .dark .rdp-head_cell { color: #9ca3af; }
            .dark .rdp-day_today:not(.rdp-day_selected) {
              color: #60a5fa;
              background-color: rgba(37, 99, 235, 0.2);
            }
            .dark .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
              background-color: rgba(59, 130, 246, 0.1);
            }
            .rdp-day.has-task-dot {
              position: relative;
            }
            .rdp-day.has-task-dot::after {
              content: '';
              position: absolute;
              bottom: 4px;
              left: 50%;
              transform: translateX(-50%);
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: linear-gradient(135deg, #3b82f6, #8b5cf6);
              box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
              z-index: 10;
            }
            .rdp-day_selected.has-task-dot::after {
              background: white !important;
              box-shadow: 0 2px 4px rgba(255, 255, 255, 0.5);
            }
            .dark .rdp-day.has-task-dot::after {
              background: linear-gradient(135deg, #60a5fa, #a78bfa);
            }
            .dark .rdp-day_selected.has-task-dot::after {
              background: white !important;
            }
          `}</style>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onDateChange(date)}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            locale={ptBR}
            modifiers={modifiers}
            modifiersClassNames={{ hasTask: 'has-task-dot' }}
            className="w-full"
          />
        </div>

        <div className="mt-6 md:mt-8 space-y-3">
          <div className="p-4 md:p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-2xl md:rounded-3xl border border-blue-100 dark:border-blue-900/50">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-blue-600 to-purple-600" />
              <p className="text-[10px] md:text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Dias com tarefas
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Hoje</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 ring-2 ring-blue-200 dark:ring-blue-800" />
              <span>Selecionado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lado Direito: Tarefas do Dia Selecionado */}
      <div className={`flex-1 bg-[#fafafa] dark:bg-gray-950 flex flex-col ${activeSection === 'calendar' ? 'hidden md:flex' : 'flex'}`}>
        <header className="p-4 md:p-8 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">
                {format(selectedDate, "EEEE", { locale: ptBR })}
              </p>
              <h3 className="text-lg md:text-2xl font-black text-gray-800 dark:text-gray-100">
                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </h3>
            </div>
            <button 
              onClick={onAddTask}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-5 py-3 rounded-2xl transition-all shadow-lg shadow-blue-100 dark:shadow-none active:scale-95"
            >
              <PlusCircle size={16} /> ADICIONAR
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8">
          <AnimatePresence mode="popLayout">
            {dayTasks.length > 0 ? (
              <Motion.div 
                key={formattedSelectedDate}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Entregas Pendentes */}
                {dayTasks.some(t => t.isDelivery) && (
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-green-500" /> Entregas Pendentes
                    </h4>
                    <div className="grid gap-3">
                      {dayTasks.filter(t => t.isDelivery).map(task => (
                        <TaskItem
                          key={task.id}
                          task={{
                            ...task,
                            completed: !!task.completed
                          }}
                          category={categories.find(c => c.id === task.categoryId)}
                          onToggle={(id) => onToggleTask(id, formattedSelectedDate)}
                          onDelete={onDeleteTask}
                          onEdit={onEditTask}
                          selectedDate={formattedSelectedDate}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Tarefas Permanentes */}
                {dayTasks.some(t => t.isPermanent) && (
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-500" /> Rotina Diária
                    </h4>
                    <div className="grid gap-3">
                      {dayTasks.filter(t => t.isPermanent).map(task => (
                        <TaskItem
                          key={task.id}
                          task={{
                            ...task,
                            completed: task.completedDates.includes(formattedSelectedDate)
                          }}
                          category={categories.find(c => c.id === task.categoryId)}
                          onToggle={(id) => onToggleTask(id, formattedSelectedDate)}
                          onDelete={onDeleteTask}
                          onEdit={onEditTask}
                          selectedDate={formattedSelectedDate}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Tarefas do Dia */}
                {dayTasks.some(t => !t.isPermanent && !t.isDelivery) && (
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-orange-500" /> Compromissos Específicos
                    </h4>
                    <div className="grid gap-3">
                      {dayTasks.filter(t => !t.isPermanent && !t.isDelivery).map(task => (
                        <TaskItem
                          key={task.id}
                          task={{
                            ...task,
                            completed: !!task.completed
                          }}
                          category={categories.find(c => c.id === task.categoryId)}
                          onToggle={(id) => onToggleTask(id, formattedSelectedDate)}
                          onDelete={onDeleteTask}
                          onEdit={onEditTask}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </Motion.div>
            ) : (
              <Motion.div 
                key="empty"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 0.6, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center h-full text-center py-12 md:py-20"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 dark:bg-gray-900 rounded-2xl md:rounded-3xl flex items-center justify-center mb-4 md:mb-6">
                  <ListTodo size={32} className="text-gray-300 md:hidden" />
                  <ListTodo size={40} className="text-gray-300 hidden md:block" />
                </div>
                <p className="text-lg font-bold text-gray-400">Nenhuma tarefa para este dia.</p>
                <button 
                  onClick={onAddTask}
                  className="mt-4 text-blue-600 font-black text-sm hover:underline"
                >
                  Clique para adicionar +
                </button>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};