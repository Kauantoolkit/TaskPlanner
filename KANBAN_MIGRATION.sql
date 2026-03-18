-- ============================================================
-- KANBAN MIGRATION — Execute no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE IF NOT EXISTS kanban_boards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title         text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id)
);

CREATE TABLE IF NOT EXISTS kanban_columns (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id             uuid NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  title                text NOT NULL,
  "order"              integer NOT NULL DEFAULT 0,
  color                text,
  is_completion_column boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kanban_cards (
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

CREATE INDEX IF NOT EXISTS idx_kanban_boards_task_id        ON kanban_boards(task_id);
CREATE INDEX IF NOT EXISTS idx_kanban_boards_workspace_id   ON kanban_boards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_board_id      ON kanban_columns(board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_column_id       ON kanban_cards(column_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_board_id        ON kanban_cards(board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_column_order    ON kanban_cards(column_id, "order");
CREATE INDEX IF NOT EXISTS idx_kanban_cards_board_order     ON kanban_cards(board_id, "order");

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger 1: workspace_id do board deve corresponder ao da task
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

DROP TRIGGER IF EXISTS trg_kanban_boards_check_workspace ON kanban_boards;
CREATE TRIGGER trg_kanban_boards_check_workspace
  BEFORE INSERT OR UPDATE ON kanban_boards
  FOR EACH ROW EXECUTE FUNCTION check_kanban_board_workspace();

-- Trigger 2: board_id do card deve corresponder ao board da coluna
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

DROP TRIGGER IF EXISTS trg_kanban_cards_check_board ON kanban_cards;
CREATE TRIGGER trg_kanban_cards_check_board
  BEFORE INSERT OR UPDATE ON kanban_cards
  FOR EACH ROW EXECUTE FUNCTION check_card_board_consistency();

-- Trigger 3: updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kanban_boards_updated_at ON kanban_boards;
CREATE TRIGGER trg_kanban_boards_updated_at
  BEFORE UPDATE ON kanban_boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_kanban_columns_updated_at ON kanban_columns;
CREATE TRIGGER trg_kanban_columns_updated_at
  BEFORE UPDATE ON kanban_columns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_kanban_cards_updated_at ON kanban_cards;
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
DROP POLICY IF EXISTS "workspace members can manage kanban_boards" ON kanban_boards;
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
DROP POLICY IF EXISTS "workspace members can manage kanban_columns" ON kanban_columns;
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
DROP POLICY IF EXISTS "workspace members can manage kanban_cards" ON kanban_cards;
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

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

CREATE OR REPLACE FUNCTION move_kanban_card(
  p_card_id     uuid,
  p_to_column   uuid,
  p_new_order   integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_from_column uuid;
  v_old_order   integer;
  v_board_id    uuid;
  v_to_board    uuid;
BEGIN
  SELECT column_id, "order", board_id
    INTO v_from_column, v_old_order, v_board_id
    FROM kanban_cards
   WHERE id = p_card_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card % não encontrado ou sem permissão de acesso', p_card_id;
  END IF;

  SELECT board_id INTO v_to_board
    FROM kanban_columns
   WHERE id = p_to_column;

  IF v_to_board IS DISTINCT FROM v_board_id THEN
    RAISE EXCEPTION 'Coluna destino pertence a outro board — operação negada';
  END IF;

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

  UPDATE kanban_cards
     SET "order" = "order" - 1
   WHERE column_id = v_from_column
     AND "order" > v_old_order;

  UPDATE kanban_cards
     SET "order" = "order" + 1
   WHERE column_id = p_to_column
     AND "order" >= p_new_order;

  UPDATE kanban_cards
     SET column_id = p_to_column, "order" = p_new_order
   WHERE id = p_card_id;
END;
$$;

CREATE OR REPLACE FUNCTION reorder_kanban_cards(
  p_column_id uuid,
  p_card_ids  uuid[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  i integer;
BEGIN
  FOR i IN 1 .. array_length(p_card_ids, 1) LOOP
    UPDATE kanban_cards
       SET "order" = i - 1
     WHERE id = p_card_ids[i]
       AND column_id = p_column_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION reorder_kanban_columns(
  p_board_id   uuid,
  p_column_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
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

CREATE OR REPLACE FUNCTION create_kanban_board_with_columns(
  p_task_id      uuid,
  p_workspace_id uuid,
  p_title        text,
  p_columns      jsonb
)
RETURNS uuid
LANGUAGE plpgsql
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
      v_col->>'color'
    );
    v_i := v_i + 1;
  END LOOP;

  RETURN v_board_id;
END;
$$;

-- ============================================================
-- GRANTS — Necessário para o role authenticated ter acesso
-- RLS sozinho não basta; o GRANT libera o acesso base à tabela
-- ============================================================

GRANT ALL ON kanban_boards  TO authenticated;
GRANT ALL ON kanban_columns TO authenticated;
GRANT ALL ON kanban_cards   TO authenticated;

GRANT EXECUTE ON FUNCTION create_kanban_board_with_columns(uuid, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION move_kanban_card(uuid, uuid, integer)                      TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_kanban_cards(uuid, uuid[])                         TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_kanban_columns(uuid, uuid[])                       TO authenticated;
