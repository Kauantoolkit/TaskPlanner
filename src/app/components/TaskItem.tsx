import React, { useState } from 'react';
import { Check, Trash2, Repeat, Calendar, Tag, Target, Clock, Pencil, LayoutDashboard, Plus, BookOpen } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripIcon } from './GripIcon';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Task, Category } from '../types';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { KanbanBoardView } from './kanban/KanbanBoardView';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TaskItemProps {
  task: Task;
  category?: Category;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
  onAddDailyLog?: (id: string, date: string, description: string) => void;
  selectedDate?: string;
  id?: string;
  workspaceId?: string;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, category, onToggle, onDelete, onEdit, onAddDailyLog, selectedDate, workspaceId }) => {
  const [kanbanOpen, setKanbanOpen] = useState(() =>
    sessionStorage.getItem('kanbanOpen') === task.id
  );
  const [showLogForm, setShowLogForm] = useState(false);
  const [logText, setLogText] = useState('');

  const openKanban = () => {
    sessionStorage.setItem('kanbanOpen', task.id);
    setKanbanOpen(true);
  };

  const closeKanban = () => {
    sessionStorage.removeItem('kanbanOpen');
    setKanbanOpen(false);
  };
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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

    // Tasks de entrega têm seu próprio indicador de urgência — não aplica alerta de horário
    if (task.isDelivery) return 'normal';

    // Só aplica alerta de tempo se a tarefa é de hoje
    const today = format(new Date(), 'yyyy-MM-dd');
    if (selectedDate && selectedDate !== today) return 'normal';

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

  // Daily log helpers (delivery tasks)
  const todayLog = task.isDelivery
    ? (task.dailyLogs ?? []).find(l => l.date === (selectedDate ?? format(new Date(), 'yyyy-MM-dd')))
    : undefined;

  const handleSubmitLog = () => {
    if (!logText.trim() || !onAddDailyLog) return;
    const date = selectedDate ?? format(new Date(), 'yyyy-MM-dd');
    onAddDailyLog(task.id, date, logText.trim());
    setLogText('');
    setShowLogForm(false);
  };

  // Format minutes
  const formatMinutesToReadable = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  return (
    <>
    {kanbanOpen && (
      <KanbanBoardView
        taskId={task.id}
        taskTitle={task.text}
        workspaceId={workspaceId ?? task.workspaceId}
        dailyLogs={task.dailyLogs ?? []}
        onClose={closeKanban}
      />
    )}
    <div ref={setNodeRef} style={style} {...attributes} className="w-full">
      <Motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        style={{
          transform: isDragging ? 'scale(1.02)' : 'none',
          zIndex: isDragging ? 1000 : 1,
          boxShadow: isDragging ? '0 20px 40px rgba(0,0,0,0.2)' : 'none'
        }}
        className={cn(
          "group flex items-center justify-between p-4 rounded-xl border shadow-sm transition-all relative",
          timeStatus === 'red'
            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 hover:shadow-lg hover:border-red-300 dark:hover:border-red-700"
            : timeStatus === 'yellow'
              ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 hover:shadow-lg hover:border-yellow-300 dark:hover:border-yellow-700"
              : task.isDelivery
                ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800 hover:shadow-lg hover:border-green-300 dark:hover:border-green-700"
                : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900"
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

        <div className="flex items-center gap-2 md:gap-3 w-full">
          {/* Grip Handle */}
          <div {...listeners} className="p-1 -m-1 cursor-grab active:cursor-grabbing touch-none shrink-0">
            <GripIcon />
          </div>

          {/* Time Badge - Always visible if scheduled */}
          {task.scheduledTime && (
            <div className={cn(
              "flex items-center justify-center gap-1 px-2 md:px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl font-black text-xs md:text-sm transition-all shrink-0 min-w-[60px] md:min-w-[70px]",
              task.completed
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 line-through"
                : timeStatus === 'red'
                  ? "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 ring-2 ring-red-300 dark:ring-red-800 animate-pulse"
                  : timeStatus === 'yellow'
                    ? "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 ring-2 ring-yellow-300 dark:ring-yellow-800"
                    : "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400"
            )}>
              <Clock size={14} strokeWidth={3} className="shrink-0" />
              <span>{task.scheduledTime}</span>
            </div>
          )}

          {task.isDelivery ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (todayLog) {
                  setLogText(todayLog.description);
                }
                setShowLogForm(v => !v);
              }}
              title={todayLog ? 'Editar progresso do dia' : 'Registrar progresso do dia'}
              className={cn(
                "w-6 h-6 md:w-7 md:h-7 rounded-full border-2 flex items-center justify-center transition-all shrink-0 active:scale-90",
                todayLog
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-green-400 dark:border-green-600 text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30"
              )}
            >
              {todayLog ? <Check size={13} strokeWidth={4} /> : <Plus size={13} strokeWidth={3} />}
            </button>
          ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(task.id);
            }}
            className={cn(
              "w-6 h-6 md:w-7 md:h-7 rounded-full border-2 flex items-center justify-center transition-all shrink-0 active:scale-90",
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
          )}

          <div className="flex flex-col flex-1 min-w-0">
            <span className={cn(
              "text-sm md:text-base font-medium transition-all break-words leading-tight mb-1",
              task.completed
                ? "text-gray-400 dark:text-gray-500 line-through"
                : timeStatus === 'red'
                  ? "text-red-700 dark:text-red-300"
                  : timeStatus === 'yellow'
                    ? "text-yellow-700 dark:text-yellow-300"
                    : "text-gray-700 dark:text-gray-200"
            )}>
              {task.text}
            </span>

            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              {/* Duration badge if available */}
              {task.scheduledTime && task.estimatedDurationMinutes && !task.completed && (
                <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                  {formatMinutesToReadable(task.estimatedDurationMinutes)}
                </span>
              )}
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
              ) : task.recurringType === 'weekly' ? (
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-purple-500 bg-purple-50/50 dark:bg-purple-950/30 px-1.5 py-0.5 rounded transition-colors">
                  <Repeat size={10} className="rotate-90" /> Semanal
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
                <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                  <Calendar size={10} /> {format(parseISO(task.deliveryDate), "dd/MM", { locale: ptBR })}
                </span>
              )}
              {task.isDelivery && (
                <button
                  onClick={e => { e.stopPropagation(); openKanban(); }}
                  className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-1.5 py-0.5 rounded transition-colors"
                  title="Abrir quadro Kanban"
                >
                  <LayoutDashboard size={10} /> Kanban
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit!(task.id);
              }}
              className="text-gray-300 dark:text-gray-600 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 opacity-0 group-hover:opacity-100 shrink-0"
            >
              <Pencil size={18} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 shrink-0"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </Motion.div>

      {/* Daily log form — only for delivery tasks */}
      {task.isDelivery && showLogForm && (
        <div className="mt-1.5 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-green-700 dark:text-green-400">
            <BookOpen size={12} />
            O que você avançou hoje nessa entrega?
          </div>
          <textarea
            autoFocus
            rows={2}
            value={logText}
            onChange={e => setLogText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitLog(); }
              if (e.key === 'Escape') { setShowLogForm(false); setLogText(''); }
            }}
            placeholder="Descreva o que foi feito..."
            className="w-full text-sm rounded-lg border border-green-200 dark:border-green-700 bg-white dark:bg-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmitLog}
              disabled={!logText.trim()}
              className="flex-1 text-xs py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors font-semibold"
            >
              Salvar
            </button>
            <button
              onClick={() => { setShowLogForm(false); setLogText(''); }}
              className="text-xs px-3 py-1.5 rounded-lg border dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              ×
            </button>
          </div>
          {todayLog && (
            <p className="text-[11px] text-green-600 dark:text-green-400 italic">
              Log atual: "{todayLog.description}"
            </p>
          )}
        </div>
      )}
    </div>
    </>
  );
};
