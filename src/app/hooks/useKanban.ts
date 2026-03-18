import { useState, useEffect, useCallback } from 'react';
import { useDataRepository } from './useDataRepository';
import { KanbanBoardFull } from '../types';
import * as localUtils from '../utils/kanbanLocalUtils';

export function useKanban(taskId: string | null) {
  const { repository, isSupabase } = useDataRepository();
  const [boardFull, setBoardFull] = useState<KanbanBoardFull | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      if (isSupabase) {
        const data = await repository.getKanbanBoard(taskId);
        setBoardFull(data);
      } else {
        setBoardFull(localUtils.getBoardFull(taskId));
      }
    } finally {
      setLoading(false);
    }
  }, [taskId, repository, isSupabase]);

  useEffect(() => {
    load();
  }, [load]);

  const initBoard = async (workspaceId: string, title: string) => {
    if (!taskId) return;
    if (isSupabase) {
      await repository.createKanbanBoard(taskId, workspaceId, title);
    } else {
      localUtils.createBoardLocal(taskId, workspaceId, title, [
        { title: 'A Fazer', isCompletionColumn: false },
        { title: 'Em Progresso', isCompletionColumn: false },
        { title: 'Concluído', isCompletionColumn: true },
      ]);
    }
    await load();
  };

  const moveCard = async (
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    newOrder: number
  ) => {
    const snapshot = boardFull;

    // Optimistic update
    setBoardFull(prev => {
      if (!prev) return prev;
      const card = prev.cards[fromColumnId]?.find(c => c.id === cardId);
      if (!card) return prev;

      const newCards = { ...prev.cards };
      newCards[fromColumnId] = (newCards[fromColumnId] ?? [])
        .filter(c => c.id !== cardId)
        .map((c, i) => ({ ...c, order: i }));

      const dest = [...(newCards[toColumnId] ?? [])];
      dest.splice(newOrder, 0, { ...card, columnId: toColumnId });
      newCards[toColumnId] = dest.map((c, i) => ({ ...c, order: i }));

      return { ...prev, cards: newCards };
    });

    try {
      if (isSupabase) {
        await repository.moveKanbanCard(cardId, toColumnId, newOrder);
      } else {
        localUtils.moveCardPersist(cardId, toColumnId, newOrder);
      }
      await load();
    } catch (err) {
      setBoardFull(snapshot);
      throw err;
    }
  };

  const addCard = async (columnId: string, title: string) => {
    if (!boardFull) return;
    if (isSupabase) {
      await repository.createKanbanCard(columnId, boardFull.board.id, title);
    } else {
      localUtils.createCardLocal(columnId, boardFull.board.id, title);
    }
    await load();
  };

  const updateCard = async (
    cardId: string,
    data: Parameters<typeof repository.updateKanbanCard>[1]
  ) => {
    if (isSupabase) {
      await repository.updateKanbanCard(cardId, data);
    } else {
      localUtils.updateCardLocal(cardId, data);
    }
    await load();
  };

  const deleteCard = async (cardId: string) => {
    if (isSupabase) {
      await repository.deleteKanbanCard(cardId);
    } else {
      localUtils.deleteCardLocal(cardId);
    }
    await load();
  };

  const addColumn = async (title: string) => {
    if (!boardFull) return;
    const order = boardFull.columns.length;
    if (isSupabase) {
      await repository.createKanbanColumn(boardFull.board.id, title, order);
    } else {
      localUtils.createColumnLocal(boardFull.board.id, title, order);
    }
    await load();
  };

  const deleteColumn = async (columnId: string) => {
    if (isSupabase) {
      await repository.deleteKanbanColumn(columnId);
    } else {
      localUtils.deleteColumnLocal(columnId);
    }
    await load();
  };

  const reorderColumns = async (orderedIds: string[]) => {
    if (!boardFull) return;
    if (isSupabase) {
      await repository.reorderKanbanColumns(boardFull.board.id, orderedIds);
    } else {
      localUtils.reorderColumnsLocal(boardFull.board.id, orderedIds);
    }
    await load();
  };

  const completionPercent = (): number => {
    if (!boardFull) return 0;
    const completionColumnIds = new Set(
      boardFull.columns.filter(c => c.isCompletionColumn).map(c => c.id)
    );
    const total = Object.values(boardFull.cards).flat().length;
    if (total === 0) return 0;
    const done = [...completionColumnIds].reduce(
      (acc, colId) => acc + (boardFull.cards[colId]?.length ?? 0),
      0
    );
    return Math.round((done / total) * 100);
  };

  const cardCount = (): number =>
    Object.values(boardFull?.cards ?? {}).flat().length;

  return {
    boardFull,
    loading,
    initBoard,
    moveCard,
    addCard,
    updateCard,
    deleteCard,
    addColumn,
    deleteColumn,
    reorderColumns,
    completionPercent,
    cardCount,
    reload: load,
  };
}
