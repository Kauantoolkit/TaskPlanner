import React, { useState, useRef, useEffect } from 'react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Trash2, Check } from 'lucide-react';
import { KanbanColumn as KanbanColumnType, KanbanCard } from '../../types';
import { KanbanCardComponent } from './KanbanCard';

// Paleta de cores predefinidas para colunas
const COLOR_PALETTE = [
  { label: 'Padrão',   value: undefined,   bg: '#f9fafb', border: '#e5e7eb' },
  { label: 'Verde',    value: '#16a34a',    bg: '#f0fdf4', border: '#86efac' },
  { label: 'Azul',     value: '#2563eb',    bg: '#eff6ff', border: '#93c5fd' },
  { label: 'Amarelo',  value: '#ca8a04',    bg: '#fefce8', border: '#fde047' },
  { label: 'Laranja',  value: '#ea580c',    bg: '#fff7ed', border: '#fdba74' },
  { label: 'Vermelho', value: '#dc2626',    bg: '#fef2f2', border: '#fca5a5' },
  { label: 'Roxo',     value: '#7c3aed',    bg: '#f5f3ff', border: '#c4b5fd' },
  { label: 'Rosa',     value: '#db2777',    bg: '#fdf2f8', border: '#f9a8d4' },
  { label: 'Cinza',    value: '#4b5563',    bg: '#f3f4f6', border: '#9ca3af' },
];

function getColorEntry(color?: string) {
  return COLOR_PALETTE.find(c => c.value === color) ?? COLOR_PALETTE[0];
}

interface KanbanColumnProps {
  column: KanbanColumnType;
  cards: KanbanCard[];
  onCardAdded: (columnId: string, title: string) => Promise<void>;
  onCardUpdated: (cardId: string, data: Partial<Pick<KanbanCard, 'title' | 'description' | 'dueDate' | 'labels'>>) => Promise<void>;
  onCardDeleted: (cardId: string) => Promise<void>;
  onColumnUpdated: (columnId: string, data: { title?: string; color?: string; isCompletionColumn?: boolean }) => Promise<void>;
  onColumnDeleted: (columnId: string) => Promise<void>;
}

export function KanbanColumnComponent({
  column,
  cards,
  onCardAdded,
  onCardUpdated,
  onCardDeleted,
  onColumnUpdated,
  onColumnDeleted,
}: KanbanColumnProps) {
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [editingHeader, setEditingHeader] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [editColor, setEditColor] = useState<string | undefined>(column.color);
  const [editIsCompletion, setEditIsCompletion] = useState(column.isCompletionColumn);
  const editRef = useRef<HTMLDivElement>(null);

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

  // Fechar editor ao clicar fora
  useEffect(() => {
    if (!editingHeader) return;
    const handler = (e: MouseEvent) => {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        setEditingHeader(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editingHeader]);

  const handleSaveHeader = async () => {
    if (!editTitle.trim()) return;
    await onColumnUpdated(column.id, {
      title: editTitle.trim(),
      color: editColor,
      isCompletionColumn: editIsCompletion,
    });
    setEditingHeader(false);
  };

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    await onCardAdded(column.id, newCardTitle.trim());
    setNewCardTitle('');
    setAddingCard(false);
  };

  const colorEntry = getColorEntry(column.color);

  // Estilos do header baseados na cor
  const headerStyle: React.CSSProperties = column.color
    ? { backgroundColor: colorEntry.bg, borderColor: colorEntry.border, borderBottomWidth: 1, borderBottomStyle: 'solid' }
    : {};

  const accentStyle: React.CSSProperties = column.color
    ? { backgroundColor: column.color }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex flex-col w-64 shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm overflow-visible"
    >
      {/* Barra de cor no topo */}
      {column.color && (
        <div className="h-1 rounded-t-xl" style={accentStyle} />
      )}

      {/* Header */}
      {editingHeader ? (
        /* ── Modo edição ── */
        <div
          ref={editRef}
          className="flex flex-col gap-2 p-3 bg-white dark:bg-gray-800 rounded-t-xl border-b border-gray-200 dark:border-gray-700 shadow-lg z-10"
        >
          <input
            autoFocus
            className="w-full border dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm font-bold dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveHeader(); if (e.key === 'Escape') setEditingHeader(false); }}
          />

          {/* Paleta de cores */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Cor</p>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PALETTE.map(c => (
                <button
                  key={c.label}
                  title={c.label}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => setEditColor(c.value)}
                  className="relative w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                  style={{
                    backgroundColor: c.value ?? '#e5e7eb',
                    borderColor: editColor === c.value ? '#1d4ed8' : 'transparent',
                    outline: editColor === c.value ? '2px solid #93c5fd' : 'none',
                  }}
                >
                  {editColor === c.value && (
                    <Check size={10} className="text-white drop-shadow" strokeWidth={3} />
                  )}
                  {c.value === undefined && editColor === undefined && (
                    <Check size={10} className="text-gray-500" strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle coluna de conclusão */}
          <label className="flex items-center gap-2 cursor-pointer select-none" onPointerDown={e => e.stopPropagation()}>
            <div
              onClick={() => setEditIsCompletion(v => !v)}
              className={`w-8 h-4 rounded-full transition-colors ${editIsCompletion ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${editIsCompletion ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-300">Coluna de conclusão</span>
          </label>

          <div className="flex gap-1.5 pt-1">
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={handleSaveHeader}
              className="flex-1 text-xs py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Salvar
            </button>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => {
                setEditTitle(column.title);
                setEditColor(column.color);
                setEditIsCompletion(column.isCompletionColumn);
                setEditingHeader(false);
              }}
              className="text-xs px-3 py-1.5 rounded-lg border dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              ×
            </button>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => { setEditingHeader(false); onColumnDeleted(column.id); }}
              className="text-xs px-2 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Remover coluna"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ) : (
        /* ── Modo normal ── */
        <div
          {...listeners}
          style={headerStyle}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl border-b cursor-grab active:cursor-grabbing select-none ${
            !column.color
              ? column.isCompletionColumn
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              : ''
          }`}
        >
          <span
            className="flex-1 text-sm font-bold truncate"
            style={column.color ? { color: column.color } : {}}
          >
            {column.title}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium shrink-0">
            {cards.length}
          </span>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={() => {
              setEditTitle(column.title);
              setEditColor(column.color);
              setEditIsCompletion(column.isCompletionColumn);
              setEditingHeader(true);
            }}
            className="text-xs px-1.5 py-0.5 rounded text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
            title="Editar coluna"
          >
            Editar
          </button>
        </div>
      )}

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
