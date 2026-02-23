import React from 'react';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { Task } from '../types';

interface CalendarModalProps {
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  tasks: Task[];
}

export const CalendarModal: React.FC<CalendarModalProps> = ({ onClose, onSelectDate, selectedDate, tasks }) => {
  // Customizar os dias que têm tarefas para mostrar um indicador
  const daysWithTasks = tasks.map(t => t.date ? new Date(t.date) : null).filter(Boolean) as Date[];

  const modifiers = {
    hasTask: (date: Date) => tasks.some(t => {
      if (t.isPermanent) return true;
      return t.date === format(date, 'yyyy-MM-dd');
    })
  };

  const modifiersStyles = {
    hasTask: {
      fontWeight: 'bold',
      textDecoration: 'underline',
      textDecorationColor: '#3b82f6',
      textDecorationThickness: '2px'
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-8 pb-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-gray-800 dark:text-gray-100 tracking-tight flex items-center gap-2">
              <CalendarIcon size={24} className="text-blue-600" /> Calendário
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="flex justify-center mb-6 calendar-container">
            <style>{`
              .rdp {
                --rdp-cell-size: 45px;
                --rdp-accent-color: #2563eb;
                --rdp-background-color: #eff6ff;
                margin: 0;
              }
              .rdp-day_selected {
                background-color: var(--rdp-accent-color) !important;
                color: white !important;
                font-weight: 900 !important;
                border-radius: 12px !important;
              }
              .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
                background-color: var(--rdp-background-color);
                border-radius: 12px;
              }
              .dark .rdp-day { color: #e5e7eb; }
              .dark .rdp-month { color: #f3f4f6; }
              .dark .rdp-caption_label { color: #f3f4f6; }
              .dark .rdp-head_cell { color: #9ca3af; }
            `}</style>
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && onSelectDate(date)}
              locale={ptBR}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="border-none"
            />
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl mb-4">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest text-center">
              Dias sublinhados possuem tarefas ou rotinas
            </p>
          </div>
        </div>

        <div className="p-8 pt-4">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-100 dark:shadow-none"
          >
            VOLTAR PARA O PLANNER
          </button>
        </div>
      </div>
    </div>
  );
};
