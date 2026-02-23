import React, { useState, useEffect } from 'react';
import { X, Calendar, Repeat, Plus, Tag, Target, Save } from 'lucide-react';
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
}

interface AddTaskModalProps {
  onClose: () => void;
  onAdd: (task: { text: string; isPermanent: boolean; date?: string; categoryId?: string; isDelivery?: boolean; deliveryDate?: string }) => void;
  selectedDate: Date;
  categories: Category[];
  editingTask?: Task;
  onUpdate?: (id: string, task: { text: string; isPermanent: boolean; date?: string; categoryId?: string; isDelivery?: boolean; deliveryDate?: string }) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ onClose, onAdd, selectedDate, categories, editingTask, onUpdate }) => {
  const [text, setText] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [taskType, setTaskType] = useState<'unique' | 'permanent' | 'delivery'>('unique');
  const [deliveryDate, setDeliveryDate] = useState(format(addDays(selectedDate, 7), 'yyyy-MM-dd'));

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
      } else {
        setTaskType('unique');
      }
    }
  }, [editingTask, selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    const taskData = {
      text,
      isPermanent: taskType === 'permanent',
      date: taskType === 'unique' ? format(selectedDate, 'yyyy-MM-dd') : undefined,
      categoryId,
      isDelivery: taskType === 'delivery',
      deliveryDate: taskType === 'delivery' ? deliveryDate : undefined
    };
    
    if (editingTask && onUpdate) {
      onUpdate(editingTask.id, taskData);
    } else {
      onAdd(taskData);
    }
    
    setText('');
    onClose();
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
                      ? "bg-orange-50/50 dark:bg-orange-950/20 border-orange-500 text-orange-600" 
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

              <div className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                <Calendar size={18} className="text-gray-400" />
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                  Agendado para: {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
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