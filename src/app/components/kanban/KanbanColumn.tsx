import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Trash2 } from 'lucide-react';
import { KanbanColumn as KanbanColumnType, KanbanCard } from '../../types';
import { KanbanCardComponent } from './KanbanCard';

interface KanbanColumnProps {
  column: KanbanColumnType;
  cards: KanbanCard[];
  onCardAdded: (columnId: string, title: string) => Promise<void>;
  onCardUpdated: (cardId: string, data: Partial<Pick<KanbanCard, 'title' | 'description' | 'dueDate' | 'labels'>>) => Promise<void>;
  onCardDeleted: (cardId: string) => Promise<void>;
  onColumnDeleted: (columnId: string) => Promise<void>;
}

export function KanbanColumnComponent({
  column,
  cards,
  onCardAdded,
  onCardUpdated,
  onCardDeleted,
  onColumnDeleted,
}: KanbanColumnProps) {
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    await onCardAdded(column.id, newCardTitle.trim());
    setNewCardTitle('');
    setAddingCard(false);
  };

  const headerBg = column.isCompletionColumn
    ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-700'
    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex flex-col w-64 shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 shadow-sm"
    >
      {/* Column header — arrastar pelo header inteiro */}
      <div
        {...listeners}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl border-b cursor-grab active:cursor-grabbing select-none ${headerBg}`}
      >
        <span className="flex-1 text-sm font-bold text-gray-700 dark:text-gray-200 truncate">
          {column.title}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium shrink-0">
          {cards.length}
        </span>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => onColumnDeleted(column.id)}
          className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
          title="Remover coluna"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Cards list */}
      <div className="flex flex-col gap-2 p-2 flex-1 min-h-[80px]">
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <KanbanCardComponent
              key={card.id}
              card={card}
              columnId={column.id}
              onUpdate={onCardUpdated}
              onDelete={onCardDeleted}
            />
          ))}
        </SortableContext>

        {/* Add card form */}
        {addingCard ? (
          <div className="flex flex-col gap-1">
            <input
              autoFocus
              className="w-full border dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Título do card..."
              value={newCardTitle}
              onChange={e => setNewCardTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddCard();
                if (e.key === 'Escape') { setAddingCard(false); setNewCardTitle(''); }
              }}
            />
            <div className="flex gap-1">
              <button
                onClick={handleAddCard}
                className="flex-1 text-xs py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Adicionar
              </button>
              <button
                onClick={() => { setAddingCard(false); setNewCardTitle(''); }}
                className="text-xs px-2 py-1 rounded-lg border dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors py-1 px-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 w-full"
          >
            <Plus size={12} /> Adicionar card
          </button>
        )}
      </div>
    </div>
  );
}
