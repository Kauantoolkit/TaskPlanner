// Hooks de dados do workspace atual. Leitura via React Query; escrita com
// atualização otimista: a tela muda na hora e, se o servidor recusar, volta
// ao estado anterior e mostra o erro (antes os erros eram engolidos e a tela
// ficava mentindo até recarregar).

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from './api';
import { useActiveWorkspace } from '../context/WorkspaceContext';
import { useCurrentUser } from '../auth/AuthProvider';
import { toggleDonePatch, normalizeDraft, type IsoDate, type Task, type TaskDraft } from '../domain/tasks';
import type { Category, DailyLog, KanbanBoardFull, Preferences } from '../types';
import { DEFAULT_PREFERENCES } from '../types';

export const keys = {
  tasks: (ws: string) => ['tasks', ws] as const,
  categories: (ws: string) => ['categories', ws] as const,
  dailyLogs: (ws: string) => ['dailyLogs', ws] as const,
  preferences: (user: string) => ['preferences', user] as const,
  kanban: (taskId: string) => ['kanban', taskId] as const,
};

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Mutation otimista genérica: aplica `update` no cache de `key`, chama o
 * servidor e, em erro, restaura o cache e mostra `errorMessage`.
 */
function useOptimistic<TVars, TData>(
  key: QueryKey,
  mutationFn: (vars: TVars) => Promise<unknown>,
  update: (old: TData, vars: TVars) => TData,
  errorMessage: string,
  options: { refetch?: boolean } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (vars: TVars) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<TData>(key);
      if (previous !== undefined) qc.setQueryData<TData>(key, update(previous, vars));
      return { previous };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(key, ctx.previous);
      toast.error(`${errorMessage}: ${err.message}`);
    },
    onSettled: () => {
      if (options.refetch) qc.invalidateQueries({ queryKey: key });
    },
  });
}

// ── Tarefas ──────────────────────────────────────────────────

export function useTasks() {
  const { workspace } = useActiveWorkspace();
  return useQuery({
    queryKey: keys.tasks(workspace.id),
    queryFn: () => api.fetchTasks(workspace.id),
  });
}

export function useTaskActions() {
  const { workspace, memberId } = useActiveWorkspace();
  const key = keys.tasks(workspace.id);

  const create = useOptimistic<{ id: string; draft: TaskDraft }, Task[]>(
    key,
    ({ id, draft }) => api.createTask({ id, workspaceId: workspace.id, createdById: memberId, draft }),
    (old, { id, draft }) => [...old, {
      ...normalizeDraft(draft),
      id,
      workspaceId: workspace.id,
      completed: false,
      completedDates: [],
      startedAt: null,
      assignedToId: draft.assignedToId ?? memberId,
      createdById: memberId,
      createdAt: new Date().toISOString(),
    }],
    'Erro ao criar tarefa',
    { refetch: true },
  );

  const edit = useOptimistic<{ id: string; draft: TaskDraft }, Task[]>(
    key,
    ({ id, draft }) => api.updateTaskDraft(id, draft),
    (old, { id, draft }) => old.map(t => (t.id === id ? { ...t, ...normalizeDraft(draft) } : t)),
    'Erro ao salvar tarefa',
  );

  const patch = useOptimistic<{ id: string; patch: Partial<Task> }, Task[]>(
    key,
    ({ id, patch }) => api.patchTask(id, patch),
    (old, { id, patch }) => old.map(t => (t.id === id ? { ...t, ...patch } : t)),
    'Erro ao atualizar tarefa',
  );

  const remove = useOptimistic<string, Task[]>(
    key,
    api.deleteTask,
    (old, id) => old.filter(t => t.id !== id),
    'Erro ao excluir tarefa',
  );

  return {
    create: useCallback((draft: TaskDraft) => create.mutateAsync({ id: newId(), draft }), [create]),
    edit: useCallback((id: string, draft: TaskDraft) => edit.mutateAsync({ id, draft }), [edit]),
    toggleDone: useCallback((task: Task, day: IsoDate) => {
      const p = toggleDonePatch(task, day);
      if (p) patch.mutate({ id: task.id, patch: p });
    }, [patch]),
    remove: useCallback((id: string) => remove.mutateAsync(id), [remove]),
  };
}

// ── Categorias ───────────────────────────────────────────────

export function useCategories() {
  const { workspace } = useActiveWorkspace();
  return useQuery({
    queryKey: keys.categories(workspace.id),
    queryFn: () => api.fetchCategories(workspace.id),
  });
}

export function useCategoryActions() {
  const { workspace } = useActiveWorkspace();
  const qc = useQueryClient();
  const key = keys.categories(workspace.id);

  const create = useOptimistic<Category, Category[]>(
    key,
    c => api.createCategory(workspace.id, c),
    (old, c) => [...old, c],
    'Erro ao criar categoria',
  );

  const remove = useOptimistic<string, Category[]>(
    key,
    api.deleteCategory,
    (old, id) => {
      // a FK limpa no banco; aqui limpa no cache das tarefas
      qc.setQueryData<Task[]>(keys.tasks(workspace.id), tasks =>
        tasks?.map(t => (t.categoryId === id ? { ...t, categoryId: null } : t)));
      return old.filter(c => c.id !== id);
    },
    'Erro ao remover categoria',
  );

  return {
    create: useCallback((name: string, color: string) => create.mutateAsync({ id: newId(), name, color }), [create]),
    remove: useCallback((id: string) => remove.mutateAsync(id), [remove]),
  };
}

// ── Logs diários das entregas ────────────────────────────────

export function useDailyLogs(deliveryTaskIds: string[]) {
  const { workspace } = useActiveWorkspace();
  return useQuery({
    queryKey: [...keys.dailyLogs(workspace.id), [...deliveryTaskIds].sort().join(',')],
    queryFn: () => api.fetchDailyLogs(deliveryTaskIds),
    placeholderData: prev => prev,
  });
}

export function useSaveDailyLog() {
  const { workspace, memberId } = useActiveWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: string; date: IsoDate; description: string }) =>
      api.saveDailyLog({ ...input, authorId: memberId }),
    onSuccess: (saved: DailyLog) => {
      qc.setQueriesData<DailyLog[]>({ queryKey: keys.dailyLogs(workspace.id) }, logs =>
        logs && [...logs.filter(l => !(l.taskId === saved.taskId && l.date === saved.date)), saved]);
    },
    onError: (err: Error) => toast.error(`Erro ao salvar o progresso: ${err.message}`),
  });
}

// ── Preferências ─────────────────────────────────────────────

export function usePreferences(): Preferences {
  const user = useCurrentUser();
  const { data } = useQuery({
    queryKey: keys.preferences(user.id),
    queryFn: api.fetchPreferences,
  });
  return data ?? DEFAULT_PREFERENCES;
}

export function useSavePreferences() {
  const user = useCurrentUser();
  const m = useOptimistic<Preferences, Preferences>(
    keys.preferences(user.id),
    prefs => api.savePreferences(user.id, prefs),
    (_old, prefs) => prefs,
    'Erro ao salvar configurações',
  );
  return useCallback((prefs: Preferences) => m.mutate(prefs), [m]);
}

// ── Kanban ───────────────────────────────────────────────────

export function useKanbanBoard(taskId: string) {
  return useQuery({
    queryKey: keys.kanban(taskId),
    queryFn: () => api.fetchKanbanBoard(taskId),
  });
}

export function useKanbanActions(taskId: string) {
  const qc = useQueryClient();
  const { workspace } = useActiveWorkspace();
  const key = keys.kanban(taskId);
  const board = () => qc.getQueryData<KanbanBoardFull | null>(key);

  // Kanban: sem otimismo (exceto mover), recarrega o quadro depois de cada ação
  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
    onError: (err: Error) => toast.error(`Erro no kanban: ${err.message}`),
  });
  const exec = (fn: () => Promise<unknown>) => run.mutateAsync(fn).then(() => undefined);

  const move = useOptimistic<{ cardId: string; from: string; to: string; order: number }, KanbanBoardFull | null>(
    key,
    ({ cardId, to, order }) => api.moveKanbanCard(cardId, to, order),
    (prev, { cardId, from, to, order }) => {
      if (!prev) return prev;
      const card = prev.cards[from]?.find(c => c.id === cardId);
      if (!card) return prev;
      const cards = { ...prev.cards };
      cards[from] = (cards[from] ?? []).filter(c => c.id !== cardId).map((c, i) => ({ ...c, order: i }));
      const dest = [...(cards[to] ?? [])];
      dest.splice(order, 0, { ...card, columnId: to });
      cards[to] = dest.map((c, i) => ({ ...c, order: i }));
      return { ...prev, cards };
    },
    'Erro ao mover card',
    { refetch: true },
  );

  return {
    initBoard: (title: string) => exec(() => api.createKanbanBoard(taskId, workspace.id, title)),
    moveCard: (cardId: string, from: string, to: string, order: number) =>
      move.mutateAsync({ cardId, from, to, order }).then(() => undefined),
    addCard: (columnId: string, title: string) => exec(() => {
      const b = board();
      if (!b) return Promise.resolve();
      return api.createKanbanCard(columnId, b.board.id, title, b.cards[columnId]?.length ?? 0);
    }),
    updateCard: (cardId: string, data: api.KanbanCardPatch) => exec(() => api.updateKanbanCard(cardId, data)),
    deleteCard: (cardId: string) => exec(() => api.deleteKanbanCard(cardId)),
    addColumn: (title: string) => exec(() => {
      const b = board();
      if (!b) return Promise.resolve();
      return api.createKanbanColumn(b.board.id, title, b.columns.length);
    }),
    updateColumn: (columnId: string, data: Parameters<typeof api.updateKanbanColumn>[1]) =>
      exec(() => api.updateKanbanColumn(columnId, data)),
    deleteColumn: (columnId: string) => exec(() => api.deleteKanbanColumn(columnId)),
    reorderColumns: (orderedIds: string[]) => exec(() => {
      const b = board();
      return b ? api.reorderKanbanColumns(b.board.id, orderedIds) : Promise.resolve();
    }),
  };
}

/** % de cards nas colunas marcadas como "concluído". */
export function kanbanCompletion(board: KanbanBoardFull | null | undefined): { percent: number; total: number } {
  if (!board) return { percent: 0, total: 0 };
  const total = Object.values(board.cards).flat().length;
  if (total === 0) return { percent: 0, total: 0 };
  const done = board.columns
    .filter(c => c.isCompletionColumn)
    .reduce((acc, c) => acc + (board.cards[c.id]?.length ?? 0), 0);
  return { percent: Math.round((done / total) * 100), total };
}
