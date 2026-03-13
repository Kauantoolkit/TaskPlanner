import React from 'react';
import { Check, Trash2, Repeat, Calendar, Tag, Target, Clock, Pencil } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Task, Category } from '../types';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TaskItemProps {
  task: Task;
  category?: Category;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
  selectedDate?: string;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, category, onToggle, onDelete, onEdit, selectedDate }) => {
  // Calculate days until delivery
  const getDaysUntilDelivery = () => {
    if (!task.isDelivery || !task.deliveryDate) return null;
    const currentDate = selectedDate ? parseISO(selectedDate) : new Date();
    const delivery = parseISO(task.deliveryDate);
    return differenceInDays(delivery, currentDate);
  };

  const daysUntil = getDaysUntilDelivery();
  const isDeliveryToday = daysUntil === 0;
  const isDeliveryUrgent = daysUntil !== null && daysUntil <= 3;

  // Calculate time-based status
  const getTimeStatus = (): 'normal' | 'yellow' | 'red' => {
    if (!task.scheduledTime || task.completed) return 'normal';
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentMinutes = currentHour * 60 + currentMinute;
    
    const [scheduledHour, scheduledMinute] = task.scheduledTime.split(':').map(Number);
    const scheduledMinutes = scheduledHour * 60 + scheduledMinute;
    
    const duration = task.estimatedDurationMinutes || 240;
    const yellowAlert = task.yellowAlertMinutes || Math.floor(duration / 2);
    
    const endMinutes = scheduledMinutes + duration;
    const yellowThreshold = endMinutes - yellowAlert;
    
    if (currentMinutes < scheduledMinutes) return 'normal';
    if (currentMinutes >= endMinutes) return 'red';
    if (currentMinutes >= yellowThreshold) return 'yellow';
    
    return 'normal';
  };

  const timeStatus = getTimeStatus();

  // Format minutes
  const formatMinutesToReadable = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  return (
    <Motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group flex items-center justify-between p-4 rounded-xl border shadow-sm transition-all relative",
        timeStatus === 'red' 
          ? "bg-red-50 dark:bg-red-950/20 border-red-200 hover:border-red-300"
          : timeStatus === 'yellow'
            ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 hover:border-yellow-300"
            : task.isDelivery 
              ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300"
              : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-blue-100"
      )}
    >
      {/* Status bar */}
      {(timeStatus === 'yellow' || timeStatus === 'red') && (
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl",
          timeStatus === 'red' ? "bg-red-500 animate-pulse" : "bg-yellow-500"
        )} />
      )}
      {task.isDelivery && timeStatus === 'normal' && (
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl",
          isDeliveryToday ? "bg-red-500" : isDeliveryUrgent ? "bg-orange-500" : "bg-green-500"
        )} />
      )}

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={() => onToggle(task.id)}
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 flex-shrink-0",
            task.completed 
              ? "bg-blue-500 border-blue-500 text-white" 
              : timeStatus === 'red'
                ? "border-red-500 text-red-500 hover:bg-red-100"
                : timeStatus === 'yellow'
                  ? "border-yellow-500 text-yellow-500 hover:bg-yellow-100"
                  : "border-gray-200 dark:border-gray-700 text-transparent hover:border-blue-400 hover:text-blue-400"
          )}
        >
          <AnimatePresence mode="wait">
            {task.completed && (
              <Motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <Check size={14} strokeWidth={4} />
              </Motion.div>
            )}
          </AnimatePresence>
        </button>

        <div className="flex flex-col flex-1 min-w-0">
          <span className={cn(
            "text-base font-medium transition-all break-words leading-tight",
            task.completed ? "line-through text-gray-400 dark:text-gray-500" 
            : timeStatus === 'red' ? "text-red-700" 
            : timeStatus === 'yellow' ? "text-yellow-700" 
            : "text-gray-700 dark:text-gray-200"
          )}>
            {task.text}
          </span>
          
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
            {timeStatus === 'red' && !task.completed && (
              <span className="font-bold px-2 py-0.5 rounded bg-red-100 text-red-600 animate-pulse">
                ATRASADA
              </span>
            )}
            {timeStatus === 'yellow' && !task.completed && (
              <span className="font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-600">
                EM BREVE
              </span>
            )}
            {task.isDelivery && (
              <span className={cn(
                "font-bold px-2 py-0.5 rounded",
                isDeliveryToday ? "bg-red-50 text-red-600" 
                : isDeliveryUrgent ? "bg-orange-50 text-orange-600" 
                : "bg-green-50 text-green-600"
              )}>
                Entrega {isDeliveryToday ? "HOJE" : `em ${daysUntil}d`}
              </span>
            )}
            {task.isPermanent && (
              <span className="font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                Permanente
              </span>
            )}
            {task.recurringType === 'weekly' && (
              <span className="font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-600">
                Semanal
              </span>
            )}
            {category && (
              <span className={cn(
                "font-bold px-2 py-0.5 rounded flex items-center gap-1",
                category.color
              )}>
                {category.name}
              </span>
            )}
            {task.scheduledTime && (
              <span className="font-bold px-2 py-0.5 rounded bg-gray-50 text-gray-600 text-[11px]">
                {task.scheduledTime}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-1 ml-2 flex-shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(task.id)}
              className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-all opacity-0 group-hover:opacity-100"
              title="Editar"
            >
              <Pencil size={16} />
            </button>
          )}
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
            title="Deletar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </Motion.div>
  );
};

