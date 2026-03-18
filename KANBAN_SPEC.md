# Especificação: Quadros Kanban por Task

## Visão Geral

Cada Task (especialmente as do tipo **Entrega/Delivery**) pode ter um **Quadro Kanban** associado, permitindo decompor a entrega em cartões menores que avançam por colunas (ex: "A Fazer → Em Progresso → Concluído"). O progresso do quadro pode refletir na porcentagem de conclusão da task pai.

---

## 1. Modelo de Dados

### 1.1 Novas Entidades

```
Task (existente)
  └──< KanbanBoard (1 por task, opcional)
         └──< KanbanColumn (N colunas ordenadas)
                └──< KanbanCard  (N cartões por coluna)
```

### 1.2 TypeScript — `src/app/types.ts`

Adicionar ao arquivo de tipos existente:

```typescript
interface KanbanBoard {
  id: string;
  taskId: string;          // FK → Task.id
  workspaceId: string;     // FK → Workspace.id (para RLS e filtragem)
  title: string;           // nome do quadro, ex: "Entrega Relatório Q1"
  createdAt: string;       // ISO 8601
  updatedAt: string;
}

interface KanbanColumn {
  id: string;
  boardId: string;         // FK → KanbanBoard.id
  title: string;           // ex: "A Fazer", "Em Progresso", "Concluído"
  order: number;           // posição da coluna (0-indexed)
  color?: string;          // cor opcional da coluna (Tailwind class)
  isCompletionColumn: boolean; // se true, cards aqui contam como "concluídos"
}

interface KanbanCard {
  id: string;
  columnId: string;        // FK → KanbanColumn.id
  boardId: string;         // desnormalizado para queries diretas ao board
  title: string;
  description?: string;
  order: number;           // posição dentro da coluna
  assignedToId?: string;   // FK → workspace_members.id (opcional)
  dueDate?: string;        // YYYY-MM-DD
  labels: string[];        // array de strings livres (ex: ["urgente", "frontend"])
  createdAt: string;       // ISO 8601
  updatedAt: string;
}

// Tipo agregado para carregar o board completo de uma vez
interface KanbanBoardFull {
  board: KanbanBoard;
  columns: KanbanColumn[];             // ordenadas por `order` ASC
  cards: Record<string, KanbanCard[]>; // columnId → cards (ordenados por `order` ASC)
}
```

**Funções de mapeamento snake_case → camelCase** (adicionar em `SupabaseRepository.ts`):

```typescript
function mapBoard(r: Record<string, unknown>): KanbanBoard {
  return {
    id:          r.id as string,
    taskId:      r.task_id as string,
    workspaceId: r.workspace_id as string,
    title:       r.title as string,
    createdAt:   r.created_at as string,
    updatedAt:   r.updated_at as string,
  };
}

function mapColumn(r: Record<string, unknown>): KanbanColumn {
  return {
    id:                 r.id as string,
    boardId:            r.board_id as string,
    title:              r.title as string,
    order:              r.order as number,
    color:              r.color as string | undefined,
    isCompletionColumn: r.is_completion_column as boolean,
  };
}

function mapCard(r: Record<string, unknown>): KanbanCard {
  return {
    id:           r.id as string,
    columnId:     r.column_id as string,
    boardId:      r.board_id as string,
    title:        r.title as string,
    description:  r.description as string | undefined,
    order:        r.order as number,
    assignedToId: r.assigned_to_id as string | undefined,
    dueDate:      r.due_date as string | undefined,
    labels:       (r.labels as string[]) ?? [],   // text[] → string[], nunca undefined
    createdAt:    r.created_at as string,
    updatedAt:    r.updated_at as string,
  };
}
```

---

## 2. Schema do Banco de Dados (Supabase / PostgreSQL)

### 2.1 Migration SQL

```sql
-- ============================================================
-- KANBAN BOARDS
-- ============================================================
CREATE TABLE kanban_boards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title         text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id)  -- uma task tem no máximo 1 board
);

-- ============================================================
-- KANBAN COLUMNS
-- ============================================================
CREATE TABLE kanban_columns (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id             uuid NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  title                text NOT NULL,
  "order"              integer NOT NULL DEFAULT 0,
  color                text,
  is_completion_column boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- KANBAN CARDS
-- ============================================================
CREATE TABLE kanban_cards (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id      uuid NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  board_id       uuid NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  title          text NOT NULL,
  description    text,
  "order"        integer NOT NULL DEFAULT 0,
  assigned_to_id uuid REFERENCES workspace_members(id) ON DELETE SET NULL,
  due_date       date,
  labels         text[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_kanban_boards_task_id        ON kanban_boards(task_id);
CREATE INDEX idx_kanban_boards_workspace_id   ON kanban_boards(workspace_id);
CREATE INDEX idx_kanban_columns_board_id      ON kanban_columns(board_id);
CREATE INDEX idx_kanban_cards_column_id       ON kanban_cards(column_id);
CREATE INDEX idx_kanban_cards_board_id        ON kanban_cards(board_id);
-- Compostos para queries com ORDER BY "order" — aceleram listagens
CREATE INDEX idx_kanban_cards_column_order    ON kanban_cards(column_id, "order");
CREATE INDEX idx_kanban_cards_board_order     ON kanban_cards(board_id,  "order");

-- ============================================================
-- TRIGGER 1 — workspace_id do board deve corresponder ao da task
-- ============================================================
CREATE OR REPLACE FUNCTION check_kanban_board_workspace()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tasks
    WHERE id = NEW.task_id AND workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'workspace_id do board não corresponde ao workspace_id da task';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kanban_boards_check_workspace
  BEFORE INSERT OR UPDATE ON kanban_boards
  FOR EACH ROW EXECUTE FUNCTION check_kanban_board_workspace();

-- ============================================================
-- TRIGGER 2 — board_id do card deve corresponder ao board da coluna
-- Impede que column_id e board_id fiquem dessincronizados
-- ============================================================
CREATE OR REPLACE FUNCTION check_card_board_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_board_id uuid;
BEGIN
  SELECT board_id INTO v_board_id
    FROM kanban_columns
   WHERE id = NEW.column_id;

  IF NEW.board_id IS DISTINCT FROM v_board_id THEN
    RAISE EXCEPTION 'board_id do card (%) é inconsistente com o board_id da coluna (%)',
      NEW.board_id, v_board_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kanban_cards_check_board
  BEFORE INSERT OR UPDATE ON kanban_cards
  FOR EACH ROW EXECUTE FUNCTION check_card_board_consistency();

-- ============================================================
-- TRIGGER 3 — updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kanban_boards_updated_at
  BEFORE UPDATE ON kanban_boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_kanban_columns_updated_at
  BEFORE UPDATE ON kanban_columns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_kanban_cards_updated_at
  BEFORE UPDATE ON kanban_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE kanban_boards  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards   ENABLE ROW LEVEL SECURITY;

-- kanban_boards
CREATE POLICY "workspace members can manage kanban_boards"
  ON kanban_boards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = kanban_boards.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = kanban_boards.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- kanban_columns
CREATE POLICY "workspace members can manage kanban_columns"
  ON kanban_columns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM kanban_boards kb
      JOIN workspace_members wm ON wm.workspace_id = kb.workspace_id
      WHERE kb.id = kanban_columns.board_id
        AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kanban_boards kb
      JOIN workspace_members wm ON wm.workspace_id = kb.workspace_id
      WHERE kb.id = kanban_columns.board_id
        AND wm.user_id = auth.uid()
    )
  );

-- kanban_cards
CREATE POLICY "workspace members can manage kanban_cards"
  ON kanban_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM kanban_boards kb
      JOIN workspace_members wm ON wm.workspace_id = kb.workspace_id
      WHERE kb.id = kanban_cards.board_id
        AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kanban_boards kb
      JOIN workspace_members wm ON wm.workspace_id = kb.workspace_id
      WHERE kb.id = kanban_cards.board_id
        AND wm.user_id = auth.uid()
    )
  );
```

### 2.2 Stored Procedures (RPC)

> **Importante — SECURITY INVOKER vs SECURITY DEFINER**
>
> Todas as funções abaixo usam `SECURITY INVOKER` (padrão do Postgres). Isso significa que a função executa com as permissões do usuário que a chama, logo **as políticas RLS continuam ativas automaticamente**. Usar `SECURITY DEFINER` com owner `postgres` (role com `BYPASSRLS`) anularia as políticas RLS — evitar.

#### `move_kanban_card` — movimentação atômica entre colunas

Toda movimentação **deve usar esta função**. Sem ela, `order` fica inconsistente após múltiplos drags concorrentes.

```sql
CREATE OR REPLACE FUNCTION move_kanban_card(
  p_card_id     uuid,
  p_to_column   uuid,
  p_new_order   integer
)
RETURNS void
LANGUAGE plpgsql
-- SECURITY INVOKER (padrão) — RLS aplicado com permissões do usuário chamador
AS $$
DECLARE
  v_from_column uuid;
  v_old_order   integer;
  v_board_id    uuid;
  v_to_board    uuid;
BEGIN
  -- 1) Obter estado atual do card (RLS já filtra: só vê cards do seu workspace)
  SELECT column_id, "order", board_id
    INTO v_from_column, v_old_order, v_board_id
    FROM kanban_cards
   WHERE id = p_card_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card % não encontrado ou sem permissão de acesso', p_card_id;
  END IF;

  -- 2) Validar que coluna destino pertence ao mesmo board (previne cross-board moves)
  SELECT board_id INTO v_to_board
    FROM kanban_columns
   WHERE id = p_to_column;

  IF v_to_board IS DISTINCT FROM v_board_id THEN
    RAISE EXCEPTION 'Coluna destino pertence a outro board — operação negada';
  END IF;

  -- 3) Mesma coluna: apenas reposicionar
  IF v_from_column = p_to_column THEN
    IF v_old_order < p_new_order THEN
      UPDATE kanban_cards
         SET "order" = "order" - 1
       WHERE column_id = v_from_column
         AND "order" > v_old_order
         AND "order" <= p_new_order;
    ELSE
      UPDATE kanban_cards
         SET "order" = "order" + 1
       WHERE column_id = v_from_column
         AND "order" >= p_new_order
         AND "order" < v_old_order;
    END IF;
    UPDATE kanban_cards SET "order" = p_new_order WHERE id = p_card_id;
    RETURN;
  END IF;

  -- 4) Colunas diferentes: fechar gap na origem
  UPDATE kanban_cards
     SET "order" = "order" - 1
   WHERE column_id = v_from_column
     AND "order" > v_old_order;

  -- 5) Abrir espaço no destino
  UPDATE kanban_cards
     SET "order" = "order" + 1
   WHERE column_id = p_to_column
     AND "order" >= p_new_order;

  -- 6) Mover o card (trigger check_card_board_consistency valida board_id)
  UPDATE kanban_cards
     SET column_id = p_to_column, "order" = p_new_order
   WHERE id = p_card_id;
END;
$$;
```

#### `reorder_kanban_cards` — reordenação atômica dentro de uma coluna

Mesmo padrão de `reorder_kanban_columns`. **Não usar SQL dinâmico com strings** (risco de injection e dependência de RPC genérico inexistente).

```sql
CREATE OR REPLACE FUNCTION reorder_kanban_cards(
  p_column_id uuid,
  p_card_ids  uuid[]   -- IDs na nova ordem desejada
)
RETURNS void
LANGUAGE plpgsql
-- SECURITY INVOKER — RLS ativo
AS $$
DECLARE
  i integer;
BEGIN
  FOR i IN 1 .. array_length(p_card_ids, 1) LOOP
    UPDATE kanban_cards
       SET "order" = i - 1      -- 0-indexed
     WHERE id = p_card_ids[i]
       AND column_id = p_column_id;  -- garante que o card pertence à coluna
  END LOOP;
END;
$$;
```

#### `reorder_kanban_columns` — reordenação atômica de colunas

```sql
CREATE OR REPLACE FUNCTION reorder_kanban_columns(
  p_board_id   uuid,
  p_column_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
-- SECURITY INVOKER — RLS ativo
AS $$
DECLARE
  i integer;
BEGIN
  FOR i IN 1 .. array_length(p_column_ids, 1) LOOP
    UPDATE kanban_columns
       SET "order" = i - 1
     WHERE id = p_column_ids[i]
       AND board_id = p_board_id;
  END LOOP;
END;
$$;
```

#### `create_kanban_board_with_columns` — criação verdadeiramente atômica

Board + colunas criados em uma única transação no banco. Elimina o risco de board sem colunas em caso de falha parcial.

```sql
CREATE OR REPLACE FUNCTION create_kanban_board_with_columns(
  p_task_id      uuid,
  p_workspace_id uuid,
  p_title        text,
  p_columns      jsonb   -- array de {title, is_completion_column, color?}
)
RETURNS uuid             -- retorna o id do board criado
LANGUAGE plpgsql
-- SECURITY INVOKER — RLS ativo; trigger check_kanban_board_workspace valida workspace
AS $$
DECLARE
  v_board_id uuid;
  v_col      jsonb;
  v_i        integer := 0;
BEGIN
  INSERT INTO kanban_boards (task_id, workspace_id, title)
  VALUES (p_task_id, p_workspace_id, p_title)
  RETURNING id INTO v_board_id;

  FOR v_col IN SELECT * FROM jsonb_array_elements(p_columns) LOOP
    INSERT INTO kanban_columns (board_id, title, "order", is_completion_column, color)
    VALUES (
      v_board_id,
      v_col->>'title',
      v_i,
      (v_col->>'is_completion_column')::boolean,
      v_col->>'color'   -- NULL se não informado
    );
    v_i := v_i + 1;
  END LOOP;

  RETURN v_board_id;
END;
$$;
```

---

## 3. Interface do Repositório — `src/app/services/types.ts`

Adicionar ao `IDataRepository`:

```typescript
// ── Kanban ──────────────────────────────────────────────────

getKanbanBoard(taskId: string): Promise<KanbanBoardFull | null>;

createKanbanBoard(
  taskId: string,
  workspaceId: string,
  title: string,
  defaultColumns?: Array<{ title: string; isCompletionColumn?: boolean; color?: string }>
): Promise<KanbanBoard>;

deleteKanbanBoard(boardId: string): Promise<void>;

// Colunas
createKanbanColumn(boardId: string, title: string, order: number, opts?: Partial<KanbanColumn>): Promise<KanbanColumn>;
updateKanbanColumn(columnId: string, data: Partial<Pick<KanbanColumn, 'title' | 'order' | 'color' | 'isCompletionColumn'>>): Promise<void>;
deleteKanbanColumn(columnId: string): Promise<void>;
reorderKanbanColumns(boardId: string, orderedColumnIds: string[]): Promise<void>;

// Cards
createKanbanCard(columnId: string, boardId: string, title: string, opts?: Partial<KanbanCard>): Promise<KanbanCard>;
updateKanbanCard(cardId: string, data: Partial<Pick<KanbanCard, 'title' | 'description' | 'order' | 'assignedToId' | 'dueDate' | 'labels'>>): Promise<void>;
deleteKanbanCard(cardId: string): Promise<void>;
// Via stored procedure move_kanban_card — atomicidade + cross-board validation no banco
moveKanbanCard(cardId: string, toColumnId: string, newOrder: number): Promise<void>;
// Via stored procedure reorder_kanban_cards — uma roundtrip, sem SQL dinâmico
reorderKanbanCards(columnId: string, orderedCardIds: string[]): Promise<void>;
```

---

## 4. Implementação — `src/app/services/SupabaseRepository.ts`

### 4.1 `getKanbanBoard`

```typescript
async getKanbanBoard(taskId: string): Promise<KanbanBoardFull | null> {
  const { data: board } = await supabase
    .from('kanban_boards')
    .select('*')
    .eq('task_id', taskId)
    .maybeSingle(); // null se não existe, sem lançar erro

  if (!board) return null;

  // Busca paralela de colunas e cards
  const [{ data: columns }, { data: cards }] = await Promise.all([
    supabase.from('kanban_columns').select('*').eq('board_id', board.id).order('order'),
    supabase.from('kanban_cards').select('*').eq('board_id', board.id).order('order'),
  ]);

  const cardsByColumn: Record<string, KanbanCard[]> = {};
  for (const col of columns ?? []) {
    cardsByColumn[col.id] = (cards ?? [])
      .filter(c => c.column_id === col.id)
      .map(mapCard);
  }

  return {
    board: mapBoard(board),
    columns: (columns ?? []).map(mapColumn),
    cards: cardsByColumn,
  };
}
```

### 4.2 `createKanbanBoard` — via RPC atômica

```typescript
async createKanbanBoard(
  taskId: string,
  workspaceId: string,
  title: string,
  defaultColumns = [
    { title: 'A Fazer',      isCompletionColumn: false },
    { title: 'Em Progresso', isCompletionColumn: false },
    { title: 'Concluído',    isCompletionColumn: true  },
  ]
): Promise<KanbanBoard> {
  // Tudo ocorre em uma única transação no banco via RPC
  const { data: boardId, error } = await supabase.rpc('create_kanban_board_with_columns', {
    p_task_id:      taskId,
    p_workspace_id: workspaceId,
    p_title:        title,
    p_columns:      defaultColumns.map(c => ({
      title:                c.title,
      is_completion_column: c.isCompletionColumn ?? false,
      color:                c.color ?? null,
    })),
  });

  if (error) throw error;

  // Buscar o board criado para retornar o objeto completo
  const { data: board } = await supabase
    .from('kanban_boards')
    .select('*')
    .eq('id', boardId)
    .single();

  return mapBoard(board);
}
```

### 4.3 `moveKanbanCard` — via stored procedure atômica

```typescript
async moveKanbanCard(cardId: string, toColumnId: string, newOrder: number): Promise<void> {
  const { error } = await supabase.rpc('move_kanban_card', {
    p_card_id:   cardId,
    p_to_column: toColumnId,
    p_new_order: newOrder,
  });
  if (error) throw error;
}
```

### 4.4 `reorderKanbanCards` — via stored procedure (sem SQL dinâmico)

```typescript
async reorderKanbanCards(columnId: string, orderedCardIds: string[]): Promise<void> {
  if (orderedCardIds.length === 0) return;
  const { error } = await supabase.rpc('reorder_kanban_cards', {
    p_column_id: columnId,
    p_card_ids:  orderedCardIds,
  });
  if (error) throw error;
}
```

### 4.5 `reorderKanbanColumns` — via stored procedure

```typescript
async reorderKanbanColumns(boardId: string, orderedColumnIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_kanban_columns', {
    p_board_id:   boardId,
    p_column_ids: orderedColumnIds,
  });
  if (error) throw error;
}
```

---

## 5. Hook — `src/app/hooks/useKanban.ts` (novo arquivo)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useDataRepository } from './useDataRepository';
import type { KanbanBoardFull } from '../types';

export function useKanban(taskId: string | null) {
  const { repository } = useDataRepository();
  const [boardFull, setBoardFull] = useState<KanbanBoardFull | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    const data = await repository.getKanbanBoard(taskId);
    setBoardFull(data);
    setLoading(false);
  }, [taskId, repository]);

  useEffect(() => { load(); }, [load]);

  const initBoard = async (workspaceId: string, title: string) => {
    const board = await repository.createKanbanBoard(taskId!, workspaceId, title);
    await load();
    return board;
  };

  /**
   * Move um card entre colunas.
   *
   * Estratégia:
   * 1. Snapshot do estado atual para rollback em caso de erro.
   * 2. Atualização otimista imediata (UX fluida durante o drag).
   * 3. Chamada ao backend (stored procedure atômica).
   * 4. Em erro: reverte para o snapshot e relança o erro.
   * 5. Em sucesso: recarrega do backend para sincronizar orders adjacentes.
   *
   * Nota sobre o reload pós-sucesso (ponto 5):
   * O reload garante que os `order` de todos os cards das colunas afetadas
   * estejam em sincronia com o banco. O tradeoff é um breve flicker visual
   * após o drop. Para MVP isso é aceitável; futuramente pode-se substituir
   * por um resync seletivo das duas colunas afetadas (origem + destino)
   * para reduzir o flicker.
   */
  const moveCard = async (
    cardId: string,
    fromColumnId: string,
    toColumnId: string,
    newOrder: number
  ) => {
    const snapshot = boardFull;

    // Atualização otimista — espelha a lógica da stored procedure no estado local
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
      await repository.moveKanbanCard(cardId, toColumnId, newOrder);
      await load(); // resync com banco para garantir consistência
    } catch (err) {
      setBoardFull(snapshot); // rollback
      throw err;
    }
  };

  /**
   * Percentual de conclusão:
   * cards nas colunas marcadas isCompletionColumn / total de cards do board.
   */
  const completionPercent = (): number => {
    if (!boardFull) return 0;
    const completionColumnIds = new Set(
      boardFull.columns.filter(c => c.isCompletionColumn).map(c => c.id)
    );
    const total = Object.values(boardFull.cards).flat().length;
    if (total === 0) return 0;
    const done = [...completionColumnIds]
      .reduce((acc, colId) => acc + (boardFull.cards[colId]?.length ?? 0), 0);
    return Math.round((done / total) * 100);
  };

  /** Total de cards no board (para badge no botão da TaskItem) */
  const cardCount = (): number =>
    Object.values(boardFull?.cards ?? {}).flat().length;

  return { boardFull, loading, initBoard, moveCard, completionPercent, cardCount, reload: load };
}
```

---

## 6. Componentes de UI

### 6.1 Estrutura de Arquivos

```
src/app/components/kanban/
  KanbanBoardView.tsx   — view principal do quadro (colunas + cards)
  KanbanColumn.tsx      — coluna individual com lista de cards
  KanbanCard.tsx        — card individual (drag source + drop target)
  KanbanCardModal.tsx   — modal de detalhes/edição de um card
  KanbanProgress.tsx    — barra de progresso da task baseada no board
```

### 6.2 Ponto de Entrada — Botão na Task

Em `TaskItem.tsx`:

```tsx
{task.isDelivery && (
  <button
    onClick={() => setKanbanOpen(true)}
    title="Abrir quadro Kanban"
    className="text-xs text-blue-500 hover:underline flex items-center gap-1"
  >
    <LayoutIcon size={14} /> Kanban
    {cardCount > 0 && (
      <span className="ml-1 bg-blue-100 text-blue-700 rounded px-1">
        {cardCount} card{cardCount !== 1 ? 's' : ''}
      </span>
    )}
    {completionPercent > 0 && (
      <span className="ml-1 text-gray-400">({completionPercent}%)</span>
    )}
  </button>
)}
```

### 6.3 `KanbanBoardView.tsx` — Estrutura Geral

```tsx
export function KanbanBoardView({ taskId, workspaceId, onClose }) {
  const { boardFull, loading, initBoard, moveCard, completionPercent, reload } = useKanban(taskId);

  if (loading) return <LoadingSpinner />;

  if (!boardFull) {
    return (
      <div className="flex flex-col items-center gap-3 p-8">
        <p className="text-gray-500">Esta task ainda não tem um quadro Kanban.</p>
        <button onClick={() => initBoard(workspaceId, 'Quadro Kanban')} className="btn-primary">
          Criar Quadro
        </button>
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <KanbanProgress percent={completionPercent()} />
      <div className="flex gap-4 overflow-x-auto p-4 min-h-[400px]">
        <SortableContext items={boardFull.columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
          {boardFull.columns.map(col => (
            <KanbanColumnComponent
              key={col.id}
              column={col}
              cards={boardFull.cards[col.id] ?? []}
              onCardAdded={reload}
            />
          ))}
        </SortableContext>
        <AddColumnButton boardId={boardFull.board.id} onAdded={reload} />
      </div>
    </DndContext>
  );
}
```

### 6.4 Drag and Drop

O projeto **já usa `@dnd-kit`** — nenhuma dependência nova:

- `DndContext` envolve o board inteiro
- `SortableContext` com `horizontalListSortingStrategy` para colunas
- `SortableContext` com `verticalListSortingStrategy` para cards dentro de cada coluna
- `useSortable` em `KanbanCard` e `KanbanColumn` com `data: { type: 'card' | 'column', columnId }`

```typescript
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const type = active.data.current?.type;

  if (type === 'card') {
    const fromColumnId = active.data.current.columnId as string;
    const toColumnId   = (over.data.current?.columnId ?? over.id) as string;
    const destCards    = boardFull!.cards[toColumnId] ?? [];
    const overIndex    = destCards.findIndex(c => c.id === over.id);
    const newOrder     = overIndex === -1 ? destCards.length : overIndex;
    moveCard(String(active.id), fromColumnId, toColumnId, newOrder);
  }

  if (type === 'column') {
    const cols      = boardFull!.columns;
    const fromIndex = cols.findIndex(c => c.id === active.id);
    const toIndex   = cols.findIndex(c => c.id === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = [...cols];
    reordered.splice(toIndex, 0, reordered.splice(fromIndex, 1)[0]);
    repository.reorderKanbanColumns(boardFull!.board.id, reordered.map(c => c.id));
  }
}
```

### 6.5 `KanbanProgress.tsx`

```tsx
export function KanbanProgress({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b">
      <span className="text-sm text-gray-500 whitespace-nowrap">Progresso:</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-sm font-medium w-10 text-right">{percent}%</span>
    </div>
  );
}
```

---

## 7. Modo Local (localStorage)

O `LocalStorageRepository` também deve implementar os métodos kanban. Centralizar lógica em `src/app/utils/kanbanLocalUtils.ts` para evitar duplicação.

**Chaves:**

```
"kanban_boards"   → KanbanBoard[]
"kanban_columns"  → KanbanColumn[]
"kanban_cards"    → KanbanCard[]
```

```typescript
// kanbanLocalUtils.ts

export function getBoards(): KanbanBoard[] {
  return JSON.parse(localStorage.getItem('kanban_boards') ?? '[]');
}

/** Garante que uma task só tenha um board (espelha o UNIQUE do banco) */
export function assertNoBoardForTask(taskId: string): void {
  if (getBoards().some(b => b.taskId === taskId)) {
    throw new Error(`Já existe um board para a task ${taskId}`);
  }
}

/**
 * Move card de forma equivalente à stored procedure move_kanban_card.
 * Atualiza orders nas colunas origem e destino, prevenindo duplicatas.
 */
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
    if (c.id === cardId)
      return { ...c, columnId: toColumnId, order: newOrder };
    if (c.columnId === fromColumnId && c.order > oldOrder)
      return { ...c, order: c.order - 1 };
    if (c.columnId === toColumnId && c.order >= newOrder)
      return { ...c, order: c.order + 1 };
    return c;
  });
}
```

---

## 8. Integração com Task — Progresso Automático

### Estratégia A — Visual Only (recomendada para MVP)
`completionPercent()` exibido no botão Kanban. A task não é marcada como `completed` automaticamente.

### Estratégia B — Auto-complete (opcional, pós-MVP)
Quando `completionPercent() === 100`, exibir confirmação antes de atualizar a task:

```tsx
if (completionPercent() === 100) {
  const confirmed = await showConfirmDialog(
    'Todos os cards estão concluídos. Marcar a task como concluída também?'
  );
  if (confirmed) {
    await updateTask(task.id, { completed: true });
    // Registrar evento para permitir desfazer
  }
}
```

---

## 9. Testes de Segurança Recomendados

| Cenário | Resultado esperado |
|---|---|
| Usuário de outro workspace faz `SELECT` no board | 0 rows (RLS bloqueia) |
| Usuário cria coluna em board de outro workspace | `INSERT` negado pelo `WITH CHECK` |
| `move_kanban_card` com `toColumnId` de outro board | Stored procedure lança exceção |
| Criar board com `workspace_id` ≠ `task.workspace_id` | Trigger 1 lança exceção |
| Criar card com `board_id` ≠ board da coluna | Trigger 2 lança exceção |
| Usuário não autenticado (`auth.uid() = null`) | Todas as operações negadas |
| Chamar RPC `move_kanban_card` com card de outro workspace | `NOT FOUND` (RLS oculta o card) |

---

## 10. Checklist de Implementação

### Banco de Dados
- [ ] Executar Migration SQL (seção 2.1) — tabelas, índices, triggers
- [ ] Criar stored procedures: `move_kanban_card`, `reorder_kanban_cards`, `reorder_kanban_columns`, `create_kanban_board_with_columns` (seção 2.2)
- [ ] Verificar políticas RLS no SQL Editor
- [ ] Executar testes de segurança (seção 9)

### Tipos
- [ ] Adicionar `KanbanBoard`, `KanbanColumn`, `KanbanCard`, `KanbanBoardFull` em `src/app/types.ts`

### Repositório
- [ ] Adicionar métodos ao `IDataRepository` em `src/app/services/types.ts`
- [ ] Implementar métodos + funções de mapeamento em `SupabaseRepository.ts`
- [ ] Criar `src/app/utils/kanbanLocalUtils.ts`
- [ ] Implementar métodos kanban no `LocalStorageRepository`

### Hooks
- [ ] Criar `src/app/hooks/useKanban.ts`

### Componentes
- [ ] Criar pasta `src/app/components/kanban/`
- [ ] Implementar `KanbanBoardView.tsx`
- [ ] Implementar `KanbanColumn.tsx`
- [ ] Implementar `KanbanCard.tsx`
- [ ] Implementar `KanbanCardModal.tsx`
- [ ] Implementar `KanbanProgress.tsx`
- [ ] Adicionar botão "Kanban" com badge no `TaskItem.tsx`

---

## 11. Dependências

Nenhuma dependência nova é necessária. O projeto já possui:
- `@dnd-kit/core` + `@dnd-kit/sortable` — drag and drop
- `@radix-ui/*` (via shadcn/ui) — modais, dialogs, tooltips
- `tailwindcss` — estilização
- `@supabase/supabase-js` — queries + RPC ao banco
