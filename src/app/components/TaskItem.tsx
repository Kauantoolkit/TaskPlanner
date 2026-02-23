import { Check, Trash2, Repeat, Calendar, Tag, Target, Clock, Pencil } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Category } from '../types';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Task {
  id: string;
  text: string;
  isPermanent: boolean;
  completed: boolean;
  date?: string;
  categoryId?: string;
  isDelivery?: boolean;
  deliveryDate?: string;
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

  return (
    <Motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group flex items-center justify-between p-4 rounded-xl border shadow-sm transition-all relative",
        task.isDelivery 
          ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800 hover:shadow-lg hover:border-green-300 dark:hover:border-green-700"
          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900"
      )}
    >
      {task.isDelivery && (
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl",
          isDeliveryToday ? "bg-red-500" : isDeliveryUrgent ? "bg-orange-500" : "bg-green-500"
        )} />
      )}
      <div className="flex items-center gap-3 w-full">
        <button
          onClick={() => onToggle(task.id)}
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 active:scale-90",
            task.completed 
              ? "bg-blue-500 border-blue-500 text-white" 
              : "border-gray-200 dark:border-gray-700 text-transparent hover:border-blue-400 hover:text-blue-400"
          )}
        >
          <AnimatePresence mode="wait">
            {task.completed && (
              <Motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
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
            task.completed ? "text-gray-400 dark:text-gray-500 line-through" : "text-gray-700 dark:text-gray-200"
          )}>
            {task.text}
          </span>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {task.isDelivery ? (
              <span className={cn(
                "flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded transition-all",
                isDeliveryToday 
                  ? "text-red-600 bg-red-50/50 dark:bg-red-950/30 animate-pulse" 
                  : isDeliveryUrgent 
                    ? "text-orange-600 bg-orange-50/50 dark:bg-orange-950/30" 
                    : "text-green-600 bg-green-50/50 dark:bg-green-950/30"
              )}>
                <Target size={10} /> Entrega {isDeliveryToday ? "HOJE" : `em ${daysUntil} dia${daysUntil !== 1 ? 's' : ''}`}
              </span>
            ) : task.isPermanent ? (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-blue-500 bg-blue-50/50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded transition-colors">
                <Repeat size={10} /> Permanente
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-orange-500 bg-orange-50/50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded transition-colors">
                <Calendar size={10} /> Única
              </span>
            )}
            {category && (
              <span className={cn(
                "flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded transition-all",
                category.color
              )}>
                <Tag size={10} /> {category.name}
              </span>
            )}
            {task.isDelivery && task.deliveryDate && (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-gray-500 bg-gray-50/50 dark:bg-gray-950/30 px-1.5 py-0.5 rounded transition-colors">
                <Clock size={10} /> {format(parseISO(task.deliveryDate), "dd/MM", { locale: ptBR })}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {onEdit && (
          <button
            onClick={() => onEdit(task.id)}
            className="text-gray-300 dark:text-gray-600 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 opacity-0 group-hover:opacity-100 shrink-0"
          >
            <Pencil size={18} />
          </button>
        )}
        <button
          onClick={() => onDelete(task.id)}
          className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 shrink-0"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </Motion.div>
  );
};