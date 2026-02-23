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
}

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  tasks, 
  categories, 
  selectedDate, 
  onDateChange,
  onToggleTask,
  onDeleteTask,
  onAddTask
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
              --rdp-cell-size: 44px;
              --rdp-accent-color: #2563eb;
              --rdp-background-color: #eff6ff;
              margin: 0;
              width: 100%;
            }
            .rdp-months { width: 100%; justify-content: center; }
            .rdp-table { max-width: none; width: 100%; }
            .rdp-day_selected {
              background-color: var(--rdp-accent-color) !important;
              color: white !important;
              font-weight: 900 !important;
              border-radius: 16px !important;
              box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
            }
            .rdp-day {
              border-radius: 16px;
              transition: all 0.2s;
            }
            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
              background-color: var(--rdp-background-color);
            }
            .dark .rdp-day { color: #e5e7eb; }
            .dark .rdp-month { color: #f3f4f6; }
            .dark .rdp-caption_label { color: #f3f4f6; font-weight: 900; font-size: 1.1rem; }
            .dark .rdp-head_cell { color: #9ca3af; font-weight: 700; }
            .rdp-day.has-task-dot {
              position: relative;
            }
            .rdp-day.has-task-dot::after {
              content: '';
              position: absolute;
              bottom: 6px;
              left: 50%;
              transform: translateX(-50%);
              width: 5px;
              height: 5px;
              border-radius: 50%;
              background-color: #3b82f6;
              z-index: 10;
            }
            .rdp-day_selected.has-task-dot::after {
              background-color: white !important;
            }
            .dark .rdp-day.has-task-dot::after {
              background-color: #60a5fa;
            }
            .dark .rdp-day_selected.has-task-dot::after {
              background-color: white !important;
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

        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-950/30 rounded-3xl border border-blue-100 dark:border-blue-900/50">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <p className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">
              Dias com tarefas marcados com ponto
            </p>
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