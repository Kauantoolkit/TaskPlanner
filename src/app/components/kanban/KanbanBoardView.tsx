import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { X, Plus, Loader2, BookOpen } from 'lucide-react';
import { useKanban } from '../../hooks/useKanban';
import { KanbanColumnComponent } from './KanbanColumn';
import { KanbanProgress } from './KanbanProgress';
import { DailyLog } from '../../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KanbanBoardViewProps {
  taskId: string;
  taskTitle: string;
  workspaceId: string;
  dailyLogs?: DailyLog[];
  onClose: () => void;
}

export function KanbanBoardView({ taskId, taskTitle, workspaceId, dailyLogs = [], onClose }: KanbanBoardViewProps) {
  const {
    boardFull,
    loading,
    initBoard,
    moveCard,
    addCard,
    updateCard,
    deleteCard,
    addColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    completionPercent,
  } = useKanban(taskId);

  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !boardFull) return;

    const activeType = active.data.current?.type;

    if (activeType === 'card') {
      const fromColumnId = active.data.current?.columnId as string;
      const toColumnId = (over.data.current?.columnId ?? over.id) as string;
      const destCards = boardFull.cards[toColumnId] ?? [];
      const overIndex = destCards.findIndex(c => c.id === over.id);
      const newOrder = overIndex === -1 ? destCards.length : overIndex;
      try {
        await moveCard(String(active.id), fromColumnId, toColumnId, newOrder);
      } catch {
        // silently handle
      }
    }

    if (activeType === 'column') {
      const cols = boardFull.columns;
      const fromIndex = cols.findIndex(c => c.id === active.id);
      const toIndex = cols.findIndex(c => c.id === over.id);
      if (fromIndex === -1 || toIndex === -1) return;
      const reordered = [...cols];
      reordered.splice(toIndex, 0, reordered.splice(fromIndex, 1)[0]);
      await reorderColumns(reordered.map(c => c.id));
    }
  };


  const handleAddColumn = async () => {
    if (!newColumnTitle.trim()) return;
    await addColumn(newColumnTitle.trim());
    setNewColumnTitle('');
    setAddingColumn(false);
  };

  const handleInit = async () => {
    setCreating(true);
    try {
      await initBoard(workspaceId, `Kanban — ${taskTitle}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 dark:text-gray-500">Quadro Kanban</span>
          <h2 className="text-base font-bold dark:text-white truncate max-w-xs sm:max-w-md">{taskTitle}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X size={20} className="dark:text-gray-300" />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      )}

      {/* No board yet */}
      {!loading && !boardFull && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <p className="text-gray-500 dark:text-gray-400 text-center">
            Esta task ainda não tem um quadro Kanban.
          </p>
          <button
            onClick={handleInit}
            disabled={creating}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Criar Quadro
          </button>
        </div>
      )}

      {/* Board */}
      {!loading && boardFull && (
        <>
          <KanbanProgress percent={completionPercent()} />

          {/* Daily progress diary */}
          {dailyLogs.length > 0 && (
            <div className="shrink-0 px-4 py-3 border-b dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={14} className="text-green-500" />
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Diário de Progresso</span>
              </div>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {[...dailyLogs]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(log => (
                    <div key={log.date} className="flex gap-2 text-sm">
                      <span className="shrink-0 text-[11px] font-bold text-green-600 dark:text-green-400 pt-0.5 min-w-[60px]">
                        {format(parseISO(log.date), "dd/MM", { locale: ptBR })}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300 break-words">{log.description}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 p-4 min-h-full items-start">
                <SortableContext
                  items={boardFull.columns.map(c => c.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {boardFull.columns.map(col => (
                    <div key={col.id} className="group">
                      <KanbanColumnComponent
                        column={col}
                        cards={boardFull.cards[col.id] ?? []}
                        onCardAdded={addCard}
                        onCardUpdated={updateCard}
                        onCardDeleted={deleteCard}
                        onColumnUpdated={updateColumn}
                        onColumnDeleted={deleteColumn}
                      />
                    </div>
                  ))}
                </SortableContext>

                {/* Add column */}
                {addingColumn ? (
                  <div className="flex flex-col gap-2 w-64 shrink-0">
                    <input
                      autoFocus
                      className="border dark:border-gray-700 rounded-xl px-3 py-2 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome da coluna..."
                      value={newColumnTitle}
                      onChange={e => setNewColumnTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddColumn();
                        if (e.key === 'Escape') { setAddingColumn(false); setNewColumnTitle(''); }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddColumn}
                        className="flex-1 text-sm py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Adicionar
                      </button>
                      <button
                        onClick={() => { setAddingColumn(false); setNewColumnTitle(''); }}
                        className="text-sm px-3 py-1.5 rounded-lg border dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingColumn(true)}
                    className="flex items-center gap-2 w-48 shrink-0 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-sm font-medium"
                  >
                    <Plus size={16} /> Nova Coluna
                  </button>
                )}
              </div>
            </DndContext>
          </div>
        </>
      )}
    </div>
  );
}
