import { KanbanBoard, KanbanCard, KanbanColumn, KanbanBoardFull } from '../types';

export function getBoards(): KanbanBoard[] {
  return JSON.parse(localStorage.getItem('kanban_boards') ?? '[]');
}

export function getColumns(): KanbanColumn[] {
  return JSON.parse(localStorage.getItem('kanban_columns') ?? '[]');
}

export function getCards(): KanbanCard[] {
  return JSON.parse(localStorage.getItem('kanban_cards') ?? '[]');
}

function saveBoards(boards: KanbanBoard[]) {
  localStorage.setItem('kanban_boards', JSON.stringify(boards));
}

function saveColumns(columns: KanbanColumn[]) {
  localStorage.setItem('kanban_columns', JSON.stringify(columns));
}

function saveCards(cards: KanbanCard[]) {
  localStorage.setItem('kanban_cards', JSON.stringify(cards));
}

export function assertNoBoardForTask(taskId: string): void {
  if (getBoards().some(b => b.taskId === taskId)) {
    throw new Error(`Já existe um board para a task ${taskId}`);
  }
}

export function getBoardFull(taskId: string): KanbanBoardFull | null {
  const board = getBoards().find(b => b.taskId === taskId);
  if (!board) return null;

  const columns = getColumns()
    .filter(c => c.boardId === board.id)
    .sort((a, b) => a.order - b.order);

  const allCards = getCards().filter(c => c.boardId === board.id);
  const cards: Record<string, KanbanCard[]> = {};
  for (const col of columns) {
    cards[col.id] = allCards
      .filter(c => c.columnId === col.id)
      .sort((a, b) => a.order - b.order);
  }

  return { board, columns, cards };
}

export function createBoardLocal(
  taskId: string,
  workspaceId: string,
  title: string,
  defaultColumns: Array<{ title: string; isCompletionColumn?: boolean; color?: string }>
): KanbanBoard {
  assertNoBoardForTask(taskId);

  const now = new Date().toISOString();
  const board: KanbanBoard = {
    id: crypto.randomUUID(),
    taskId,
    workspaceId,
    title,
    createdAt: now,
    updatedAt: now,
  };

  const boards = getBoards();
  boards.push(board);
  saveBoards(boards);

  const columns = getColumns();
  defaultColumns.forEach((col, i) => {
    columns.push({
      id: crypto.randomUUID(),
      boardId: board.id,
      title: col.title,
      order: i,
      color: col.color,
      isCompletionColumn: col.isCompletionColumn ?? false,
    });
  });
  saveColumns(columns);

  return board;
}

export function createColumnLocal(boardId: string, title: string, order: number, opts?: Partial<KanbanColumn>): KanbanColumn {
  const col: KanbanColumn = {
    id: crypto.randomUUID(),
    boardId,
    title,
    order,
    color: opts?.color,
    isCompletionColumn: opts?.isCompletionColumn ?? false,
  };
  const cols = getColumns();
  cols.push(col);
  saveColumns(cols);
  return col;
}

export function updateColumnLocal(columnId: string, data: Partial<Pick<KanbanColumn, 'title' | 'order' | 'color' | 'isCompletionColumn'>>): void {
  const cols = getColumns().map(c => c.id === columnId ? { ...c, ...data } : c);
  saveColumns(cols);
}

export function deleteColumnLocal(columnId: string): void {
  saveColumns(getColumns().filter(c => c.id !== columnId));
  saveCards(getCards().filter(c => c.columnId !== columnId));
}

export function reorderColumnsLocal(boardId: string, orderedIds: string[]): void {
  const cols = getColumns().map(c => {
    if (c.boardId !== boardId) return c;
    const idx = orderedIds.indexOf(c.id);
    return idx === -1 ? c : { ...c, order: idx };
  });
  saveColumns(cols);
}

export function createCardLocal(columnId: string, boardId: string, title: string, opts?: Partial<KanbanCard>): KanbanCard {
  const colCards = getCards().filter(c => c.columnId === columnId);
  const nextOrder = colCards.length > 0 ? Math.max(...colCards.map(c => c.order)) + 1 : 0;
  const now = new Date().toISOString();
  const card: KanbanCard = {
    id: crypto.randomUUID(),
    columnId,
    boardId,
    title,
    description: opts?.description,
    order: opts?.order ?? nextOrder,
    assignedToId: opts?.assignedToId,
    dueDate: opts?.dueDate,
    labels: opts?.labels ?? [],
    createdAt: now,
    updatedAt: now,
  };
  const cards = getCards();
  cards.push(card);
  saveCards(cards);
  return card;
}

export function updateCardLocal(cardId: string, data: Partial<Pick<KanbanCard, 'title' | 'description' | 'order' | 'assignedToId' | 'dueDate' | 'labels'>>): void {
  const cards = getCards().map(c => c.id === cardId ? { ...c, ...data, updatedAt: new Date().toISOString() } : c);
  saveCards(cards);
}

export function deleteCardLocal(cardId: string): void {
  saveCards(getCards().filter(c => c.id !== cardId));
}

export function moveCardLocal(
  cards: KanbanCard[],
  cardId: string,
  toColumnId: string,
  newOrder: number
): KanbanCard[] {
  const card = cards.find(c => c.id === cardId)!;
  const fromColumnId = card.columnId;
  const oldOrder = card.order;

  return cards.map(c => {
    if (c.id === cardId) return { ...c, columnId: toColumnId, order: newOrder };
    if (c.columnId === fromColumnId && c.order > oldOrder) return { ...c, order: c.order - 1 };
    if (c.columnId === toColumnId && c.order >= newOrder) return { ...c, order: c.order + 1 };
    return c;
  });
}

export function moveCardPersist(cardId: string, toColumnId: string, newOrder: number): void {
  const updated = moveCardLocal(getCards(), cardId, toColumnId, newOrder);
  saveCards(updated);
}

export function reorderCardsLocal(columnId: string, orderedIds: string[]): void {
  const cards = getCards().map(c => {
    if (c.columnId !== columnId) return c;
    const idx = orderedIds.indexOf(c.id);
    return idx === -1 ? c : { ...c, order: idx };
  });
  saveCards(cards);
}

export function deleteBoardLocal(boardId: string): void {
  saveBoards(getBoards().filter(b => b.id !== boardId));
  const colIds = getColumns().filter(c => c.boardId === boardId).map(c => c.id);
  saveColumns(getColumns().filter(c => c.boardId !== boardId));
  saveCards(getCards().filter(c => !colIds.includes(c.columnId)));
}
