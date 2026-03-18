import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Pencil } from 'lucide-react';
import { KanbanCard as KanbanCardType } from '../../types';
import { KanbanCardModal } from './KanbanCardModal';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KanbanCardProps {
  card: KanbanCardType;
  columnId: string;
  onUpdate: (cardId: string, data: Partial<Pick<KanbanCardType, 'title' | 'description' | 'dueDate' | 'labels'>>) => Promise<void>;
  onDelete: (cardId: string) => Promise<void>;
}

export function KanbanCardComponent({ card, columnId, onUpdate, onDelete }: KanbanCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', columnId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all group select-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 break-words leading-snug">
              {card.title}
            </span>
            {card.description && (
              <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2">{card.description}</p>
            )}
            <div className="flex flex-wrap gap-1">
              {card.labels.map(l => (
                <span
                  key={l}
                  className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium"
                >
                  {l}
                </span>
              ))}
            </div>
            {card.dueDate && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                <Calendar size={10} />
                {format(parseISO(card.dueDate), "dd/MM", { locale: ptBR })}
              </span>
            )}
          </div>
          {/* Botão de editar — stopPropagation para não iniciar drag */}
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setModalOpen(true); }}
            className="shrink-0 p-1 rounded text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 opacity-0 group-hover:opacity-100 transition-all"
            title="Editar card"
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>

      {modalOpen && (
        <KanbanCardModal
          card={card}
          onClose={() => setModalOpen(false)}
          onUpdate={data => onUpdate(card.id, data)}
          onDelete={() => onDelete(card.id)}
        />
      )}
    </>
  );
}
