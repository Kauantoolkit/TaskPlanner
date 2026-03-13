import React from 'react';
import { format, addDays, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, ListTodo } from 'lucide-react';
import { TaskItem } from './TaskItem';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DropAnimation } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task } from '../types';
import { motion } from 'motion/react';

interface MultiDayPlannerProps {
  tasks: Task[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onToggleTask: (id: string, date: string) => void;
  onDeleteTask: (id: string) => void;
  onDropTask: (taskId: string, targetDate: string, targetSection?: string) => void;
}

export const MultiDayPlanner: React.FC<MultiDayPlannerProps> = ({
  tasks,
  selectedDate,
  onDateChange,
  onToggleTask,
  onDeleteTask,
  onDropTask
}) => {
  const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    // Multi-day logic: detect day drop zones
    const { active, over } = event;
    if (over && over.id.startsWith('day-')) {
      const targetDate = over.id.replace('day-', '');
      onDropTask(active.id, targetDate);
    }
    // Section logic handled in parent
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100">Próxima Semana</h2>
          <div className="flex gap-2">
            <button onClick={() => onDateChange(addDays(selectedDate, -7))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft />
            </button>
            <button onClick={() => onDateChange(addDays(selectedDate, 7))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6 pb-20">
        <div className="flex gap-4 min-w-max">
          {days.map((date) => {
            const dayTasks = tasks.filter(task => {
              if (task.isPermanent) return true;
              if (task.date === format(date, 'yyyy-MM-dd')) return true;
              return false;
            }).slice(0, 3); // Show top 3

            const formattedDate = format(date, 'yyyy-MM-dd');
            const isSelected = formattedDate === format(selectedDate, 'yyyy-MM-dd');

            return (
              <div 
                key={formattedDate}
                data-drop-id={`day-${formattedDate}`}
                className={`
                  flex flex-col w-64 h-96 rounded-2xl border-2 p-4 shadow-lg transition-all
                  ${isSelected ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100' : 'border-gray-200 hover:border-gray-300 hover:shadow-xl hover:scale-[1.02]'}
                `}
              >
                <div className="flex items-center gap-2 mb-4">
                  <button 
                    onClick={() => onDateChange(date)}
                    className="font-black text-lg"
                  >
                    {format(date, 'dd')}
                  </button>
                  <span className="text-xs uppercase font-bold text-gray-400">
                    {format(date, 'EEE', { locale: ptBR })}
                  </span>
                </div>

                <div className="space-y-2 flex-1">
                  {dayTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      category={undefined}
                      onToggle={() => onToggleTask(task.id, formattedDate)}
                      onDelete={onDeleteTask}
                      onEdit={() => {}}
                      selectedDate={formattedDate}
                    />
                  ))}
                  {dayTasks.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-gray-400">
                      <Calendar className="w-8 h-8" />
                      <span className="ml-2 text-sm">Solte tarefas aqui</span>
                    </div>
                  )}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-400 text-center">
                      +{dayTasks.length - 3} mais...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
