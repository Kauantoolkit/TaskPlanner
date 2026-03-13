import React, { useState, useEffect } from 'react';
import { X, Calendar, Repeat, Plus, Tag, Target, Save, Clock } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Category } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Task {
  id: string;
  text: string;
  isPermanent: boolean;
  date?: string;
  categoryId?: string;
  isDelivery?: boolean;
  deliveryDate?: string;
  recurringType?: 'daily' | 'weekly';
  recurringDays?: number[];
  scheduledTime?: string;
  estimatedDurationMinutes?: number;
  yellowAlertMinutes?: number;
  startedAt?: string;
}

type TaskType = 'unique' | 'permanent' | 'delivery' | 'weekly';

interface AddTaskModalProps {
  onClose: () => void;
  onAdd: (task: { text: string; isPermanent: boolean; date?: string; categoryId?: string; isDelivery?: boolean; deliveryDate?: string; recurringType?: 'daily' | 'weekly'; recurringDays?: number[]; scheduledTime?: string; estimatedDurationMinutes?: number; yellowAlertMinutes?: number }) => void;
  selectedDate: Date;
  categories: Category[];
  editingTask?: Task;
  onUpdate?: (id: string, task: { text: string; isPermanent: boolean; date?: string; categoryId?: string; isDelivery?: boolean; deliveryDate?: string; recurringType?: 'daily' | 'weekly'; recurringDays?: number[]; scheduledTime?: string; estimatedDurationMinutes?: number; yellowAlertMinutes?: number }) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

// Horário padrão de fim de dia (18:00)
const DEFAULT_END_OF_DAY_HOUR = 18;

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ onClose, onAdd, selectedDate, categories, editingTask, onUpdate }) => {
  const [text, setText] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [taskType, setTaskType] = useState<TaskType>('unique');
  const [deliveryDate, setDeliveryDate] = useState(format(addDays(selectedDate, 7), 'yyyy-MM-dd'));
  const [recurringDays, setRecurringDays] = useState<number[]>([1]); // Default: Segunda-feira
  
  // Novos campos de horário
  const [scheduledTime, setScheduledTime] = useState<string>('09:00');
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState<number>(240);
  const [yellowAlertMinutes, setYellowAlertMinutes] = useState<number>(120);

  // Get current day of week (0-6, 0 = Sunday)
  const currentDayOfWeek = selectedDate.getDay();

  // Calculate default duration based on scheduled time (metade do tempo até 18:00)
  const calculateDefaultDuration = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledMinutes = hours * 60 + minutes;
    const endOfDayMinutes = DEFAULT_END_OF_DAY_HOUR * 60;
    const availableMinutes = endOfDayMinutes - scheduledMinutes;
    // Metade do tempo disponível
    return Math.max(30, Math.floor(availableMinutes / 2));
  };

  // Update duration when scheduled time changes
  useEffect(() => {
    const newDuration = calculateDefaultDuration(scheduledTime);
    setEstimatedDurationMinutes(newDuration);
    // Alerta amarelo = metade da duração
    setYellowAlertMinutes(Math.max(15, Math.floor(newDuration / 2)));
  }, [scheduledTime]);

  // Initialize with editing task if provided
  useEffect(() => {
    if (editingTask) {
      setText(editingTask.text);
      setCategoryId(editingTask.categoryId);
      
      if (editingTask.isDelivery) {
        setTaskType('delivery');
        setDeliveryDate(editingTask.deliveryDate || format(addDays(selectedDate, 7), 'yyyy-MM-dd'));
      } else if (editingTask.isPermanent) {
        setTaskType('permanent');
      } else if (editingTask.recurringType === 'weekly' && editingTask.recurringDays && editingTask.recurringDays.length > 0) {
        setTaskType('weekly');
        setRecurringDays(editingTask.recurringDays);
      } else {
        setTaskType('unique');
      }
      
      // Initialize time fields
      if (editingTask.scheduledTime) {
        setScheduledTime(editingTask.scheduledTime);
      }
      if (editingTask.estimatedDurationMinutes) {
        setEstimatedDurationMinutes(editingTask.estimatedDurationMinutes);
      }
      if (editingTask.yellowAlertMinutes) {
        setYellowAlertMinutes(editingTask.yellowAlertMinutes);
      }
    }
  }, [editingTask, selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const recurringTypeValue: 'weekly' | undefined = 
      taskType === 'weekly' ? 'weekly' : undefined;
    
    const taskData = {
      text,
      isPermanent: taskType === 'permanent',
      date: taskType === 'unique' ? format(selectedDate, 'yyyy-MM-dd') : undefined,
      categoryId,
      isDelivery: taskType === 'delivery',
      deliveryDate: taskType === 'delivery' ? deliveryDate : undefined,
      recurringType: recurringTypeValue,
      recurringDays: taskType === 'weekly' ? recurringDays : undefined,
      scheduledTime,
      estimatedDurationMinutes,
      yellowAlertMinutes
    };
    
    if (editingTask && onUpdate) {
      onUpdate(editingTask.id, taskData);
    } else {
      onAdd(taskData);
    }
    
    setText('');
    onClose();
  };

  // Helper to format minutes to readable string
  const formatMinutesToReadable = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  // Helper to get day labels for display
  const getRecurringDaysLabel = () => {
    if (recurringDays.length === 1) {
      return DAYS_OF_WEEK.find(d => d.value === recurringDays[0])?.label.toLowerCase() || '';
    }
    return recurringDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.short.toLowerCase()).join(', ');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-2 md:p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-4 md:p-8 pb-4">
            <div className="flex items-center justify-between mb-4 md:mb-8">
              <h2 className="text-lg md:text-xl font-black text-gray-800 dark:text-gray-100 tracking-tight">
                {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h2>
              <button 
                type="button" 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs uppercase tracking-widest font-black text-gray-400 mb-2 block px-1">O que você vai fazer?</label>
                <input
                  autoFocus
                  type="text"
                  placeholder={
                    taskType === 'delivery' 
                      ? 'Ex: Entregar projeto final do curso' 
                      : taskType === 'permanent' 
                        ? 'Ex: Beber 2L de água' 
                        : taskType === 'weekly'
                          ? 'Ex: Aula de inglês toda segunda'
                          : 'Ex: Reunião com cliente'
                  }
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-950 outline-none rounded-2xl px-5 py-4 text-base font-bold text-gray-700 dark:text-gray-200 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest font-black text-gray-400 mb-2 block px-1">Categoria</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCategoryId(undefined)}
                    className={cn(
                      "px-4 py-2 rounded-xl border-2 text-xs font-black transition-all",
                      !categoryId 
                        ? "bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-200" 
                        : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200"
                    )}
                  >
                    NENHUMA
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl border-2 text-xs font-black transition-all flex items-center gap-2",
                        categoryId === cat.id 
                          ? "bg-white dark:bg-gray-950 border-blue-500 text-blue-600 shadow-sm" 
                          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full", cat.color.split(' ')[0])} />
                      {cat.name.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 md:flex">
                <button
                  type="button"
                  onClick={() => setTaskType('unique')}
                  className={cn(
                    "flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 rounded-2xl border-2 transition-all",
                    taskType === 'unique' 
                      ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 text-blue-600" 
                      : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200"
                  )}
                >
                  <Calendar size={24} strokeWidth={2.5} />
                  <div className="text-center">
                    <p className="text-sm font-black">Única</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Neste dia</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTaskType('permanent')}
                  className={cn(
                    "flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 rounded-2xl border-2 transition-all",
                    taskType === 'permanent' 
                      ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 text-blue-600" 
                      : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200"
                  )}
                >
                  <Repeat size={24} strokeWidth={2.5} />
                  <div className="text-center">
                    <p className="text-sm font-black">Permanente</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Todos os dias</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTaskType('weekly')}
                  className={cn(
                    "flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 rounded-2xl border-2 transition-all",
                    taskType === 'weekly' 
                      ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-500 text-purple-600" 
                      : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200"
                  )}
                >
                  <Repeat size={24} strokeWidth={2.5} className={cn(taskType === 'weekly' && "rotate-90")} />
                  <div className="text-center">
                    <p className="text-sm font-black">Semanal</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Dias específicos</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTaskType('delivery')}
                  className={cn(
                    "flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 rounded-2xl border-2 transition-all",
                    taskType === 'delivery' 
                      ? "bg-green-50/50 dark:bg-green-950/20 border-green-500 text-green-600" 
                      : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200"
                  )}
                >
                  <Target size={24} strokeWidth={2.5} />
                  <div className="text-center">
                    <p className="text-sm font-black">Entrega</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Data específica</p>
                  </div>
                </button>
              </div>

              {taskType === 'weekly' && (
                <div>
                  <label className="text-xs uppercase tracking-widest font-black text-gray-400 mb-2 block px-1">Repetir em</label>
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          if (recurringDays.includes(day.value)) {
                            // Don't allow removing if it's the last day selected
                            if (recurringDays.length > 1) {
                              setRecurringDays(recurringDays.filter(d => d !== day.value));
                            }
                          } else {
                            setRecurringDays([...recurringDays, day.value].sort());
                          }
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                          recurringDays.includes(day.value)
                            ? "bg-purple-50 dark:bg-purple-950/30 border-purple-500 text-purple-600"
                            : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200"
                        )}
                      >
                        <span className="text-xs font-black">{day.short}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2 px-1">
                    {recurringDays.length === 1 
                      ? `Esta tarefa aparecerá toda ${DAYS_OF_WEEK.find(d => d.value === recurringDays[0])?.label.toLowerCase()}`
                      : `Esta tarefa aparecerá ${getRecurringDaysLabel()}`
                    }
                  </p>
                </div>
              )}

              {/* Seção de Horário */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <label className="text-xs uppercase tracking-widest font-black text-gray-400 mb-3 block px-1 flex items-center gap-2">
                  <Clock size={14} />
                  Programação de Tempo
                </label>
                
                <div className="space-y-4">
                  {/* Horário de Início */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block px-1">Horário de Início</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-950 outline-none rounded-xl px-4 py-3 text-base font-bold text-gray-700 dark:text-gray-200 transition-all"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 px-1">Quando você vai começar esta tarefa</p>
                  </div>

                  {/* Duração Estimada */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block px-1">Duração Estimada (minutos)</label>
                    <input
                      type="number"
                      min="15"
                      max="720"
                      step="15"
                      value={estimatedDurationMinutes}
                      onChange={(e) => setEstimatedDurationMinutes(parseInt(e.target.value) || 60)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-950 outline-none rounded-xl px-4 py-3 text-base font-bold text-gray-700 dark:text-gray-200 transition-all"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 px-1">Tempo estimado: {formatMinutesToReadable(estimatedDurationMinutes)}</p>
                  </div>

                  {/* Alerta Amarelo */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block px-1">Alertar amarelo antes (minutos)</label>
                    <input
                      type="number"
                      min="5"
                      max="360"
                      step="5"
                      value={yellowAlertMinutes}
                      onChange={(e) => setYellowAlertMinutes(parseInt(e.target.value) || 30)}
                      className="w-full bg-yellow-50 dark:bg-yellow-950/20 border-2 border-transparent focus:border-yellow-500 focus:bg-white dark:focus:bg-gray-950 outline-none rounded-xl px-4 py-3 text-base font-bold text-gray-700 dark:text-gray-200 transition-all"
                    />
                    <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-1 px-1">
                      Ficará 🟡 amarelo faltando {formatMinutesToReadable(yellowAlertMinutes)} para o prazo
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                <Calendar size={18} className="text-gray-400" />
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                  {taskType === 'weekly'
                    ? recurringDays.length === 1
                      ? `Aparecerá toda ${DAYS_OF_WEEK.find(d => d.value === recurringDays[0])?.label}`
                      : `Aparecerá ${getRecurringDaysLabel()}`
                    : `Agendado para: ${format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}`
                  }
                </span>
              </div>

              {taskType === 'delivery' && (
                <div>
                  <label className="text-xs uppercase tracking-widest font-black text-gray-400 mb-2 block px-1">Data da Entrega</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    min={format(selectedDate, 'yyyy-MM-dd')}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-green-500 focus:bg-white dark:focus:bg-gray-950 outline-none rounded-2xl px-5 py-4 text-base font-bold text-gray-700 dark:text-gray-200 transition-all"
                  />
                  <p className="text-xs text-gray-400 mt-2 px-1">Esta entrega aparecerá em todos os dias até a data final</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 md:p-8 pt-4">
            <button
              type="submit"
              disabled={!text.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 md:py-4 rounded-xl md:rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              {editingTask ? (
                <><Save size={20} strokeWidth={3} /> SALVAR ALTERAÇÕES</>
              ) : (
                <><Plus size={20} strokeWidth={3} /> ADICIONAR TAREFA</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
