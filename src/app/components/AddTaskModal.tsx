import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Repeat, Plus, Tag, Target, Save, Clock } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addTaskSchema } from '../schemas/formSchemas';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Category, Task } from '../types';
import { TaskFormData, TaskType, DAYS_OF_WEEK } from '../types/formTypes';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AddTaskModalProps {
  onClose: () => void;
  onAdd: (task: TaskFormData) => void;
  selectedDate: Date;
  categories: Category[];
  editingTask?: Task;
  onUpdate?: (id: string, task: TaskFormData) => void;
}

// Horário padrão de fim de dia (18:00)
const DEFAULT_END_OF_DAY_HOUR = 18;

// Calcula duração padrão baseada no horário de início
const calculateDefaultDuration = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const scheduledMinutes = hours * 60 + minutes;
  const endOfDayMinutes = DEFAULT_END_OF_DAY_HOUR * 60;
  const availableMinutes = endOfDayMinutes - scheduledMinutes;
  // Metade do tempo disponível
  return Math.max(30, Math.floor(availableMinutes / 2));
};

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  onClose,
  onAdd,
  selectedDate,
  categories,
  editingTask,
  onUpdate
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine task type from editing task
  const getTaskTypeFromTask = (task?: Task): TaskType => {
    if (!task) return 'unique';
    if (task.isDelivery) return 'delivery';
    if (task.isPermanent) return 'permanent';
    if (task.recurringType === 'weekly' && task.recurringDays && task.recurringDays.length > 0) {
      return 'weekly';
    }
    return 'unique';
  };

  const defaultTaskType = getTaskTypeFromTask(editingTask);
  const defaultScheduledTime = editingTask?.scheduledTime || '09:00';
  const defaultDuration = editingTask?.estimatedDurationMinutes || calculateDefaultDuration(defaultScheduledTime);
  const defaultYellowAlert = editingTask?.yellowAlertMinutes || Math.max(15, Math.floor(defaultDuration / 2));

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isValid }
  } = useForm({
    resolver: zodResolver(addTaskSchema),
    mode: 'onChange',
    defaultValues: {
      text: editingTask?.text || '',
      categoryId: editingTask?.categoryId || undefined,
      taskType: defaultTaskType,
      deliveryDate: editingTask?.deliveryDate || format(addDays(selectedDate, 7), 'yyyy-MM-dd'),
      recurringDays: editingTask?.recurringDays || [1],
      scheduledTime: defaultScheduledTime,
      estimatedDurationMinutes: defaultDuration,
      yellowAlertMinutes: defaultYellowAlert
    }
  });

  const taskType = watch('taskType');
  const scheduledTime = watch('scheduledTime');
  const recurringDays = watch('recurringDays');
  const estimatedDurationMinutes = watch('estimatedDurationMinutes');

  // Current day of week (0-6, 0 = Sunday)
  const currentDayOfWeek = selectedDate.getDay();

  // Update duration and alert when scheduled time changes
  // ONLY when NOT editing (to avoid race condition)
  useEffect(() => {
    if (!editingTask && scheduledTime) {
      const newDuration = calculateDefaultDuration(scheduledTime);
      setValue('estimatedDurationMinutes', newDuration);
      setValue('yellowAlertMinutes', Math.max(15, Math.floor(newDuration / 2)));
    }
  }, [scheduledTime, editingTask, setValue]);

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
    if (!recurringDays || !Array.isArray(recurringDays) || recurringDays.length === 0) return '';
    if (recurringDays.length === 1) {
      return DAYS_OF_WEEK.find(d => d.value === recurringDays[0])?.label.toLowerCase() || '';
    }
    return recurringDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.short.toLowerCase()).join(', ');
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);

    try {
      const taskData: TaskFormData = {
        text: data.text,
        isPermanent: data.taskType === 'permanent',
        date: data.taskType === 'unique' ? format(selectedDate, 'yyyy-MM-dd') : undefined,
        category: data.category,
        isDelivery: data.taskType === 'delivery',
        deliveryDate: data.taskType === 'delivery' ? data.deliveryDate : undefined,
        recurringType: data.taskType === 'weekly' ? 'weekly' : undefined,
        recurringDays: data.taskType === 'weekly' ? data.recurringDays : undefined,
        scheduledTime: data.scheduledTime,
        estimatedDurationMinutes: data.estimatedDurationMinutes,
        yellowAlertMinutes: data.yellowAlertMinutes
      };

      if (editingTask && onUpdate) {
        await onUpdate(editingTask.id, taskData);
      } else {
        await onAdd(taskData);
      }

      // Reset form completely
      reset({
        text: '',
        categoryId: undefined,
        taskType: 'unique',
        deliveryDate: format(addDays(selectedDate, 7), 'yyyy-MM-dd'),
        recurringDays: [1],
        scheduledTime: '09:00',
        estimatedDurationMinutes: calculateDefaultDuration('09:00'),
        yellowAlertMinutes: Math.max(15, Math.floor(calculateDefaultDuration('09:00') / 2))
      });

      onClose();
    } catch (error) {
      console.error('Error submitting task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-2 md:p-4">
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-4 md:p-8 pb-4">
            <div className="flex items-center justify-between mb-4 md:mb-8">
              <h2
                id="modal-title"
                className="text-lg md:text-xl font-black text-gray-800 dark:text-gray-100 tracking-tight"
              >
                {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors min-w-[44px] min-h-[44px]"
                aria-label="Fechar modal"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Campo de Texto */}
              <div>
                <label
                  htmlFor="task-text"
                  className="text-xs uppercase tracking-widest font-black text-gray-400 mb-2 block px-1"
                >
                  O que você vai fazer?
                </label>
                <input
                  id="task-text"
                  autoFocus
                  type="text"
                  maxLength={500}
                  placeholder={
                    taskType === 'delivery'
                      ? 'Ex: Entregar projeto final do curso'
                      : taskType === 'permanent'
                        ? 'Ex: Beber 2L de água'
                        : taskType === 'weekly'
                          ? 'Ex: Aula de inglês toda segunda'
                          : 'Ex: Reunião com cliente'
                  }
                  {...register('text')}
                  className={cn(
                    "w-full bg-gray-50 dark:bg-gray-800 border-2 outline-none rounded-2xl px-5 py-4 text-base font-bold text-gray-700 dark:text-gray-200 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600",
                    errors.text
                      ? "border-red-500 focus:border-red-600 bg-red-50/50 dark:bg-red-950/20"
                      : "border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-950"
                  )}
                  aria-invalid={!!errors.text}
                  aria-describedby={errors.text ? "text-error" : undefined}
                  aria-required="true"
                />
                {errors.text && (
                  <p id="text-error" className="text-xs text-red-600 dark:text-red-400 mt-1 px-1 font-bold" role="alert">
                    {errors.text.message as string}
                  </p>
                )}
              </div>

              {/* Categoria */}
              <div>
                <label className="text-xs uppercase tracking-widest font-black text-gray-400 mb-2 block px-1">
                  Categoria
                </label>
                <div className="flex flex-wrap gap-2">
                  <Controller
                    name="categoryId"
                    control={control}
                    render={({ field }) => (
                      <>
                        <button
                          type="button"
                          onClick={() => field.onChange(undefined)}
                          className={cn(
                            "px-4 py-2 rounded-xl border-2 text-xs font-black transition-all min-h-[44px]",
                            !field.value
                              ? "bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                              : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200"
                          )}
                          aria-label="Nenhuma categoria"
                          aria-pressed={!field.value}
                        >
                          NENHUMA
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => field.onChange(cat.id)}
                            className={cn(
                              "px-4 py-2 rounded-xl border-2 text-xs font-black transition-all flex items-center gap-2 min-h-[44px]",
                              field.value === cat.id
                                ? "bg-white dark:bg-gray-950 border-blue-500 text-blue-600 shadow-sm"
                                : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200"
                            )}
                            aria-label={`Categoria ${cat.name}`}
                            aria-pressed={field.value === cat.id}
                          >
                            <div className={cn("w-2 h-2 rounded-full", cat.color.split(' ')[0])} />
                            {cat.name.toUpperCase()}
                          </button>
                        ))}
                      </>
                    )}
                  />
                </div>
              </div>

              {/* Tipo de Tarefa */}
              <div>
                <label className="text-xs uppercase tracking-widest font-black text-gray-400 mb-2 block px-1">
                  Tipo de Tarefa
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Controller
                    name="taskType"
                    control={control}
                    render={({ field }) => (
                      <>
                        <button
                          type="button"
                          onClick={() => field.onChange('unique')}
                          className={cn(
                            "flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 rounded-2xl border-2 transition-all min-h-[100px]",
                            field.value === 'unique'
                              ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 text-blue-600"
                              : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200"
                          )}
                          aria-label="Tarefa única"
                          aria-pressed={field.value === 'unique'}
                        >
                          <Calendar size={24} strokeWidth={2.5} />
                          <div className="text-center">
                            <p className="text-sm font-black">Única</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Neste dia</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => field.onChange('permanent')}
                          className={cn(
                            "flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 rounded-2xl border-2 transition-all min-h-[100px]",
                            field.value === 'permanent'
                              ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 text-blue-600"
                              : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200"
                          )}
                          aria-label="Tarefa permanente"
                          aria-pressed={field.value === 'permanent'}
                        >
                          <Repeat size={24} strokeWidth={2.5} />
                          <div className="text-center">
                            <p className="text-sm font-black">Permanente</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Todos os dias</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => field.onChange('weekly')}
                          className={cn(
                            "flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 rounded-2xl border-2 transition-all min-h-[100px]",
                            field.value === 'weekly'
                              ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-500 text-purple-600"
                              : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200"
                          )}
                          aria-label="Tarefa semanal"
                          aria-pressed={field.value === 'weekly'}
                        >
                          <Repeat size={24} strokeWidth={2.5} className={cn(field.value === 'weekly' && "rotate-90")} />
                          <div className="text-center">
                            <p className="text-sm font-black">Semanal</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Dias específicos</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => field.onChange('delivery')}
                          className={cn(
                            "flex flex-col items-center gap-2 md:gap-3 p-3 md:p-5 rounded-2xl border-2 transition-all min-h-[100px]",
                            field.value === 'delivery'
                              ? "bg-green-50/50 dark:bg-green-950/20 border-green-500 text-green-600"
                              : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200"
                          )}
                          aria-label="Tarefa de entrega"
                          aria-pressed={field.value === 'delivery'}
                        >
                          <Target size={24} strokeWidth={2.5} />
                          <div className="text-center">
                            <p className="text-sm font-black">Entrega</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Data específica</p>
                          </div>
                        </button>
                      </>
                    )}
                  />
                </div>
              </div>

              {/* Dias da Semana (Weekly) */}
              {taskType === 'weekly' && (
                <div>
                  <label className="text-xs uppercase tracking-widest font-black text-gray-400 mb-2 block px-1">
                    Repetir em
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    <Controller
                      name="recurringDays"
                      control={control}
                      render={({ field }) => (
                        <>
                          {DAYS_OF_WEEK.map((day) => {
                            const isSelected = field.value?.includes(day.value);
                            return (
                              <button
                                key={day.value}
                                type="button"
                                onClick={() => {
                                  const currentDays = field.value || [];
                                  if (isSelected) {
                                    // Don't allow removing if it's the last day
                                    if (currentDays.length > 1) {
                                      field.onChange(currentDays.filter(d => d !== day.value));
                                    }
                                  } else {
                                    field.onChange([...currentDays, day.value].sort());
                                  }
                                }}
                                className={cn(
                                  "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all min-h-[60px]",
                                  isSelected
                                    ? "bg-purple-50 dark:bg-purple-950/30 border-purple-500 text-purple-600"
                                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200"
                                )}
                                aria-label={day.label}
                                aria-pressed={isSelected}
                              >
                                <span className="text-xs font-black">{day.short}</span>
                              </button>
                            );
                          })}
                        </>
                      )}
                    />
                  </div>
                  {errors.recurringDays && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 px-1 font-bold" role="alert">
                      {errors.recurringDays.message as string}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2 px-1">
                    {recurringDays && Array.isArray(recurringDays) && recurringDays.length === 1
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
                    <label htmlFor="scheduled-time" className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block px-1">
                      Horário de Início
                    </label>
                    <input
                      id="scheduled-time"
                      type="time"
                      {...register('scheduledTime')}
                      className={cn(
                        "w-full bg-gray-50 dark:bg-gray-800 border-2 outline-none rounded-xl px-4 py-3 text-base font-bold text-gray-700 dark:text-gray-200 transition-all",
                        errors.scheduledTime
                          ? "border-red-500 focus:border-red-600"
                          : "border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-950"
                      )}
                      aria-invalid={!!errors.scheduledTime}
                      aria-describedby={errors.scheduledTime ? "time-error" : "time-hint"}
                    />
                    {errors.scheduledTime ? (
                      <p id="time-error" className="text-xs text-red-600 dark:text-red-400 mt-1 px-1 font-bold" role="alert">
                        {errors.scheduledTime.message as string}
                      </p>
                    ) : (
                      <p id="time-hint" className="text-[10px] text-gray-400 mt-1 px-1">Quando você vai começar esta tarefa</p>
                    )}
                  </div>

                  {/* Duração Estimada */}
                  <div>
                    <label htmlFor="duration" className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block px-1">
                      Duração Estimada (minutos)
                    </label>
                    <input
                      id="duration"
                      type="number"
                      min="15"
                      max="720"
                      step="15"
                      {...register('estimatedDurationMinutes', { valueAsNumber: true })}
                      className={cn(
                        "w-full bg-gray-50 dark:bg-gray-800 border-2 outline-none rounded-xl px-4 py-3 text-base font-bold text-gray-700 dark:text-gray-200 transition-all",
                        errors.estimatedDurationMinutes
                          ? "border-red-500 focus:border-red-600"
                          : "border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-950"
                      )}
                      aria-invalid={!!errors.estimatedDurationMinutes}
                      aria-describedby={errors.estimatedDurationMinutes ? "duration-error" : "duration-hint"}
                    />
                    {errors.estimatedDurationMinutes ? (
                      <p id="duration-error" className="text-xs text-red-600 dark:text-red-400 mt-1 px-1 font-bold" role="alert">
                        {errors.estimatedDurationMinutes.message as string}
                      </p>
                    ) : (
                      <p id="duration-hint" className="text-[10px] text-gray-400 mt-1 px-1">
                        Tempo estimado: {formatMinutesToReadable(estimatedDurationMinutes || 60)}
                      </p>
                    )}
                  </div>

                  {/* Alerta Amarelo */}
                  <div>
                    <label htmlFor="yellow-alert" className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block px-1">
                      Alertar amarelo antes (minutos)
                    </label>
                    <input
                      id="yellow-alert"
                      type="number"
                      min="5"
                      max="360"
                      step="5"
                      {...register('yellowAlertMinutes', { valueAsNumber: true })}
                      className={cn(
                        "w-full bg-yellow-50 dark:bg-yellow-950/20 border-2 outline-none rounded-xl px-4 py-3 text-base font-bold text-gray-700 dark:text-gray-200 transition-all",
                        errors.yellowAlertMinutes
                          ? "border-red-500 focus:border-red-600"
                          : "border-transparent focus:border-yellow-500 focus:bg-white dark:focus:bg-gray-950"
                      )}
                      aria-invalid={!!errors.yellowAlertMinutes}
                      aria-describedby={errors.yellowAlertMinutes ? "alert-error" : "alert-hint"}
                    />
                    {errors.yellowAlertMinutes ? (
                      <p id="alert-error" className="text-xs text-red-600 dark:text-red-400 mt-1 px-1 font-bold" role="alert">
                        {errors.yellowAlertMinutes.message as string}
                      </p>
                    ) : (
                      <p id="alert-hint" className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-1 px-1">
                        Ficará 🟡 amarelo faltando {formatMinutesToReadable(watch('yellowAlertMinutes') || 30)} para o prazo
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Info da Data */}
              <div className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                <Calendar size={18} className="text-gray-400" />
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                  {taskType === 'weekly'
                    ? recurringDays && Array.isArray(recurringDays) && recurringDays.length === 1
                      ? `Aparecerá toda ${DAYS_OF_WEEK.find(d => d.value === recurringDays[0])?.label}`
                      : `Aparecerá ${getRecurringDaysLabel()}`
                    : `Agendado para: ${format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}`
                  }
                </span>
              </div>

              {/* Data da Entrega */}
              {taskType === 'delivery' && (
                <div>
                  <label htmlFor="delivery-date" className="text-xs uppercase tracking-widest font-black text-gray-400 mb-2 block px-1">
                    Data da Entrega
                  </label>
                  <input
                    id="delivery-date"
                    type="date"
                    {...register('deliveryDate')}
                    min={format(selectedDate, 'yyyy-MM-dd')}
                    className={cn(
                      "w-full bg-gray-50 dark:bg-gray-800 border-2 outline-none rounded-2xl px-5 py-4 text-base font-bold text-gray-700 dark:text-gray-200 transition-all",
                      errors.deliveryDate
                        ? "border-red-500 focus:border-red-600"
                        : "border-transparent focus:border-green-500 focus:bg-white dark:focus:bg-gray-950"
                    )}
                    aria-invalid={!!errors.deliveryDate}
                    aria-describedby={errors.deliveryDate ? "delivery-error" : "delivery-hint"}
                    aria-required="true"
                  />
                  {errors.deliveryDate ? (
                    <p id="delivery-error" className="text-xs text-red-600 dark:text-red-400 mt-2 px-1 font-bold" role="alert">
                      {errors.deliveryDate.message as string}
                    </p>
                  ) : (
                    <p id="delivery-hint" className="text-xs text-gray-400 mt-2 px-1">
                      Esta entrega aparecerá em todos os dias até a data final
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 md:p-8 pt-4">
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className={cn(
                "w-full font-black py-3 md:py-4 rounded-xl md:rounded-2xl transition-all flex items-center justify-center gap-2 min-h-[56px]",
                !isValid || isSubmitting
                  ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-100 dark:shadow-none active:scale-98"
              )}
              aria-label={editingTask ? 'Salvar alterações' : 'Adicionar tarefa'}
              aria-disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  SALVANDO...
                </>
              ) : editingTask ? (
                <>
                  <Save size={20} strokeWidth={3} /> SALVAR ALTERAÇÕES
                </>
              ) : (
                <>
                  <Plus size={20} strokeWidth={3} /> ADICIONAR TAREFA
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
