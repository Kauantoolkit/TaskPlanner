-- ============================================================
-- 0000 — BASELINE
--
-- Reproduz o schema de produção como estava em 2026-10-29
-- (supabase/snapshot.json, gerado por supabase/introspect.sql).
--
-- NÃO RODE EM PRODUÇÃO: ele já está lá. Este arquivo serve para
-- recriar o banco do zero (projeto novo, staging, teste local) e
-- é o ponto de partida das próximas migrations.
--
-- Foi gerado a partir do snapshot, e não dos scripts antigos,
-- porque parte do banco foi criada direto no painel (funções
-- get_*, policies com nomes snake_case) e parte dos scripts nunca
-- rodou inteira. Duplicações e problemas foram mantidos de
-- propósito; quem corrige são as migrations seguintes.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- TABELAS
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.workspaces (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text NOT NULL,
  owner_id    uuid NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  invite_code text,
  CONSTRAINT workspaces_pkey PRIMARY KEY (id),
  CONSTRAINT workspaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT workspaces_type_check CHECK (type = ANY (ARRAY['family'::text, 'business'::text, 'personal'::text])),
  CONSTRAINT workspaces_invite_code_unique UNIQUE (invite_code)
);

CREATE TABLE public.workspace_members (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id      uuid NOT NULL,
  role         text NOT NULL,
  name         text NOT NULL,
  email        text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  CONSTRAINT workspace_members_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT workspace_members_role_check CHECK (role = ANY (ARRAY['owner'::text, 'member'::text])),
  CONSTRAINT workspace_members_workspace_id_user_id_key UNIQUE (workspace_id, user_id)
);

CREATE TABLE public.tasks (
  id                         uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id               uuid NOT NULL,
  assigned_to_id             uuid NOT NULL,
  created_by_id              uuid NOT NULL,
  text                       text NOT NULL,
  completed                  boolean DEFAULT false,
  is_permanent               boolean DEFAULT false,
  is_delivery                boolean DEFAULT false,
  delivery_date              date,
  date                       date,
  category                   text,
  created_at                 timestamptz DEFAULT now(),
  updated_at                 timestamptz DEFAULT now(),
  completed_dates            date[],
  recurring_type             text,
  recurring_day              integer,
  scheduled_time             time without time zone,
  estimated_duration_minutes integer,
  yellow_alert_minutes       integer,
  started_at                 timestamptz,
  recurring_days             jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT tasks_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  CONSTRAINT tasks_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  CONSTRAINT tasks_recurring_type_check CHECK (recurring_type = ANY (ARRAY['daily'::text, 'weekly'::text])),
  CONSTRAINT tasks_recurring_day_check CHECK (recurring_day >= 0 AND recurring_day <= 6)
);

CREATE TABLE public.categories (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name         text NOT NULL,
  color        text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT categories_workspace_id_name_key UNIQUE (workspace_id, name)
);

CREATE TABLE public.settings (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  key          text NOT NULL,
  value        jsonb NOT NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  CONSTRAINT settings_pkey PRIMARY KEY (id),
  CONSTRAINT settings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT settings_workspace_id_key_key UNIQUE (workspace_id, key)
);

CREATE TABLE public.kanban_boards (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id      uuid NOT NULL,
  workspace_id uuid NOT NULL,
  title        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kanban_boards_pkey PRIMARY KEY (id),
  CONSTRAINT kanban_boards_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
  CONSTRAINT kanban_boards_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT kanban_boards_task_id_key UNIQUE (task_id)
);

CREATE TABLE public.kanban_columns (
  id                   uuid NOT NULL DEFAULT gen_random_uuid(),
  board_id             uuid NOT NULL,
  title                text NOT NULL,
  "order"              integer NOT NULL DEFAULT 0,
  color                text,
  is_completion_column boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kanban_columns_pkey PRIMARY KEY (id),
  CONSTRAINT kanban_columns_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.kanban_boards(id) ON DELETE CASCADE
);

CREATE TABLE public.kanban_cards (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  column_id      uuid NOT NULL,
  board_id       uuid NOT NULL,
  title          text NOT NULL,
  description    text,
  "order"        integer NOT NULL DEFAULT 0,
  assigned_to_id uuid,
  due_date       date,
  labels         text[] NOT NULL DEFAULT '{}'::text[],
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kanban_cards_pkey PRIMARY KEY (id),
  CONSTRAINT kanban_cards_column_id_fkey FOREIGN KEY (column_id) REFERENCES public.kanban_columns(id) ON DELETE CASCADE,
  CONSTRAINT kanban_cards_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  CONSTRAINT kanban_cards_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.workspace_members(id) ON DELETE SET NULL
);


-- ────────────────────────────────────────────────────────────
-- ÍNDICES
-- ────────────────────────────────────────────────────────────

CREATE INDEX idx_workspace_members_user      ON public.workspace_members USING btree (user_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members USING btree (workspace_id);

CREATE INDEX idx_tasks_assigned_to    ON public.tasks USING btree (assigned_to_id);
CREATE INDEX idx_tasks_date           ON public.tasks USING btree (date);
CREATE INDEX idx_tasks_recurring_day  ON public.tasks USING btree (recurring_day);
CREATE INDEX idx_tasks_recurring_days ON public.tasks USING gin (recurring_days);
CREATE INDEX idx_tasks_recurring_type ON public.tasks USING btree (recurring_type);
CREATE INDEX idx_tasks_workspace      ON public.tasks USING btree (workspace_id);

CREATE INDEX idx_categories_workspace ON public.categories USING btree (workspace_id);

CREATE INDEX idx_kanban_boards_task_id      ON public.kanban_boards USING btree (task_id);
CREATE INDEX idx_kanban_boards_workspace_id ON public.kanban_boards USING btree (workspace_id);
CREATE INDEX idx_kanban_columns_board_id    ON public.kanban_columns USING btree (board_id);
CREATE INDEX idx_kanban_cards_board_id      ON public.kanban_cards USING btree (board_id);
CREATE INDEX idx_kanban_cards_board_order   ON public.kanban_cards USING btree (board_id, "order");
CREATE INDEX idx_kanban_cards_column_id     ON public.kanban_cards USING btree (column_id);
CREATE INDEX idx_kanban_cards_column_order  ON public.kanban_cards USING btree (column_id, "order");


-- ────────────────────────────────────────────────────────────
-- FUNÇÕES
-- ────────────────────────────────────────────────────────────

-- updated_at (duas funções idênticas; ambas em uso)
CREATE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Criadas direto no painel (não existiam em nenhum SQL do repo)
CREATE FUNCTION public.get_my_workspace_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid();
$$;

CREATE FUNCTION public.get_my_workspace_invite_code(p_workspace_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_code TEXT;
BEGIN
  SELECT invite_code INTO v_code
  FROM workspaces
  WHERE id = p_workspace_id AND owner_id = auth.uid();
  RETURN v_code;
END;
$$;

CREATE FUNCTION public.get_workspace_by_invite_code(p_code text)
RETURNS TABLE(id uuid, name text, type text, owner_id uuid, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.name, w.type, w.owner_id, w.created_at
  FROM public.workspaces w
  WHERE w.invite_code = upper(trim(p_code));
END;
$$;

CREATE FUNCTION public.get_workspace_members(p_workspace_id uuid)
RETURNS TABLE(id uuid, user_id uuid, role text, name text, email text)
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT wm.id, wm.user_id, wm.role, wm.name, wm.email
  FROM public.workspace_members wm
  WHERE wm.workspace_id = p_workspace_id
    AND EXISTS (
      SELECT 1 FROM public.workspace_members auth_check
      WHERE auth_check.workspace_id = p_workspace_id
        AND auth_check.user_id = auth.uid()
    );
$$;

-- Kanban (KANBAN_MIGRATION.sql)
CREATE FUNCTION public.check_kanban_board_workspace()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tasks
    WHERE id = NEW.task_id AND workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'workspace_id do board não corresponde ao workspace_id da task';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.check_card_board_consistency()
RETURNS trigger LANGUAGE plpgsql AS $$
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
$$;

CREATE FUNCTION public.create_kanban_board_with_columns(
  p_task_id uuid, p_workspace_id uuid, p_title text, p_columns jsonb
)
RETURNS uuid LANGUAGE plpgsql AS $$
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

CREATE FUNCTION public.move_kanban_card(p_card_id uuid, p_to_column uuid, p_new_order integer)
RETURNS void LANGUAGE plpgsql AS $$
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

CREATE FUNCTION public.reorder_kanban_cards(p_column_id uuid, p_card_ids uuid[])
RETURNS void LANGUAGE plpgsql AS $$
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

CREATE FUNCTION public.reorder_kanban_columns(p_board_id uuid, p_column_ids uuid[])
RETURNS void LANGUAGE plpgsql AS $$
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


-- ────────────────────────────────────────────────────────────
-- TRIGGERS
-- ────────────────────────────────────────────────────────────

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_kanban_boards_check_workspace BEFORE INSERT OR UPDATE ON public.kanban_boards
  FOR EACH ROW EXECUTE FUNCTION public.check_kanban_board_workspace();
CREATE TRIGGER trg_kanban_boards_updated_at BEFORE UPDATE ON public.kanban_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_kanban_columns_updated_at BEFORE UPDATE ON public.kanban_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_kanban_cards_check_board BEFORE INSERT OR UPDATE ON public.kanban_cards
  FOR EACH ROW EXECUTE FUNCTION public.check_card_board_consistency();
CREATE TRIGGER trg_kanban_cards_updated_at BEFORE UPDATE ON public.kanban_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_boards     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_cards      ENABLE ROW LEVEL SECURITY;

-- workspaces
CREATE POLICY "Users can view their workspaces" ON public.workspaces FOR SELECT
  USING (owner_id = auth.uid() OR id IN (SELECT public.get_my_workspace_ids()));
CREATE POLICY authenticated_can_create_workspace ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY owner_can_update_workspace ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid());
CREATE POLICY owner_can_delete_workspace ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- workspace_members
CREATE POLICY "Users can view members of their workspaces" ON public.workspace_members FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Members can add themselves" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members can join workspaces" ON public.workspace_members FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspaces.id FROM workspaces WHERE workspaces.owner_id = auth.uid())
              OR user_id = auth.uid());
CREATE POLICY "authenticated users can join via invite_code" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners can update members" ON public.workspace_members FOR UPDATE
  USING (workspace_id IN (SELECT workspaces.id FROM workspaces WHERE workspaces.owner_id = auth.uid()));
CREATE POLICY owner_can_remove_members ON public.workspace_members FOR DELETE
  USING (workspace_id IN (SELECT workspaces.id FROM workspaces WHERE workspaces.owner_id = auth.uid()));

-- tasks
CREATE POLICY "Users can view tasks in their workspaces" ON public.tasks FOR SELECT
  USING (workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members
                          WHERE workspace_members.user_id = auth.uid()));
CREATE POLICY "Members can create tasks" ON public.tasks FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members
                               WHERE workspace_members.user_id = auth.uid()));
CREATE POLICY "Users can update tasks in their workspaces" ON public.tasks FOR UPDATE
  USING (workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members
                          WHERE workspace_members.user_id = auth.uid())
         OR workspace_id IN (SELECT workspaces.id FROM workspaces WHERE workspaces.owner_id = auth.uid()));
CREATE POLICY "Users can delete tasks in their workspaces" ON public.tasks FOR DELETE
  USING (workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members
                          WHERE workspace_members.user_id = auth.uid())
         AND (created_by_id IN (SELECT workspace_members.id FROM workspace_members
                                WHERE workspace_members.user_id = auth.uid())
              OR assigned_to_id IN (SELECT workspace_members.id FROM workspace_members
                                    WHERE workspace_members.user_id = auth.uid())
              OR workspace_id IN (SELECT workspaces.id FROM workspaces WHERE workspaces.owner_id = auth.uid())));

-- categories
CREATE POLICY "Users can view categories in their workspaces" ON public.categories FOR SELECT
  USING (workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members
                          WHERE workspace_members.user_id = auth.uid()));
CREATE POLICY "Users can manage categories in their workspaces" ON public.categories FOR ALL
  USING (workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members
                          WHERE workspace_members.user_id = auth.uid()));

-- settings
CREATE POLICY "Users can view settings in their workspaces" ON public.settings FOR SELECT
  USING (workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members
                          WHERE workspace_members.user_id = auth.uid()));
CREATE POLICY "Users can manage settings in their workspaces" ON public.settings FOR ALL
  USING (workspace_id IN (SELECT workspace_members.workspace_id FROM workspace_members
                          WHERE workspace_members.user_id = auth.uid()));

-- kanban_boards (dois conjuntos sobrepostos: um criado no painel, outro do KANBAN_MIGRATION.sql)
CREATE POLICY "Users can view boards in their workspaces" ON public.kanban_boards FOR SELECT
  USING (workspace_id IN (SELECT workspaces.id FROM workspaces WHERE workspaces.owner_id = auth.uid()
                          UNION
                          SELECT workspace_members.workspace_id FROM workspace_members
                          WHERE workspace_members.user_id = auth.uid()));
CREATE POLICY "Members can create boards in their workspaces" ON public.kanban_boards FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspaces.id FROM workspaces WHERE workspaces.owner_id = auth.uid()
                               UNION
                               SELECT workspace_members.workspace_id FROM workspace_members
                               WHERE workspace_members.user_id = auth.uid()));
CREATE POLICY "Members can update boards in their workspaces" ON public.kanban_boards FOR UPDATE
  USING (workspace_id IN (SELECT workspaces.id FROM workspaces WHERE workspaces.owner_id = auth.uid()
                          UNION
                          SELECT workspace_members.workspace_id FROM workspace_members
                          WHERE workspace_members.user_id = auth.uid()));
CREATE POLICY "Members can delete boards in their workspaces" ON public.kanban_boards FOR DELETE
  USING (workspace_id IN (SELECT workspaces.id FROM workspaces WHERE workspaces.owner_id = auth.uid()
                          UNION
                          SELECT workspace_members.workspace_id FROM workspace_members
                          WHERE workspace_members.user_id = auth.uid()));
CREATE POLICY "workspace members can manage kanban_boards" ON public.kanban_boards FOR ALL
  USING (EXISTS (SELECT 1 FROM workspace_members wm
                 WHERE wm.workspace_id = kanban_boards.workspace_id AND wm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members wm
                      WHERE wm.workspace_id = kanban_boards.workspace_id AND wm.user_id = auth.uid()));

-- kanban_columns
CREATE POLICY "Users can view columns in their boards" ON public.kanban_columns FOR SELECT
  USING (board_id IN (SELECT kanban_boards.id FROM kanban_boards
                      WHERE kanban_boards.workspace_id IN (
                        SELECT workspaces.id FROM workspaces WHERE workspaces.owner_id = auth.uid()
                        UNION
                        SELECT workspace_members.workspace_id FROM workspace_members
                        WHERE workspace_members.user_id = auth.uid())));
CREATE POLICY "Members can manage columns in their boards" ON public.kanban_columns FOR ALL
  USING (board_id IN (SELECT kanban_boards.id FROM kanban_boards
                      WHERE kanban_boards.workspace_id IN (
                        SELECT workspaces.id FROM workspaces WHERE workspaces.owner_id = auth.uid()
                        UNION
                        SELECT workspace_members.workspace_id FROM workspace_members
                        WHERE workspace_members.user_id = auth.uid())));
CREATE POLICY "workspace members can manage kanban_columns" ON public.kanban_columns FOR ALL
  USING (EXISTS (SELECT 1 FROM kanban_boards kb JOIN workspace_members wm ON wm.workspace_id = kb.workspace_id
                 WHERE kb.id = kanban_columns.board_id AND wm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM kanban_boards kb JOIN workspace_members wm ON wm.workspace_id = kb.workspace_id
                      WHERE kb.id = kanban_columns.board_id AND wm.user_id = auth.uid()));

-- kanban_cards
CREATE POLICY "Users can view cards in their boards" ON public.kanban_cards FOR SELECT
  USING (board_id IN (SELECT kanban_boards.id FROM kanban_boards
                      WHERE kanban_boards.workspace_id IN (
                        SELECT workspaces.id FROM workspaces WHERE workspaces.owner_id = auth.uid()
                        UNION
                        SELECT workspace_members.workspace_id FROM workspace_members
                        WHERE workspace_members.user_id = auth.uid())));
CREATE POLICY "Members can manage cards in their boards" ON public.kanban_cards FOR ALL
  USING (board_id IN (SELECT kanban_boards.id FROM kanban_boards
                      WHERE kanban_boards.workspace_id IN (
                        SELECT workspaces.id FROM workspaces WHERE workspaces.owner_id = auth.uid()
                        UNION
                        SELECT workspace_members.workspace_id FROM workspace_members
                        WHERE workspace_members.user_id = auth.uid())));
CREATE POLICY "workspace members can manage kanban_cards" ON public.kanban_cards FOR ALL
  USING (EXISTS (SELECT 1 FROM kanban_boards kb JOIN workspace_members wm ON wm.workspace_id = kb.workspace_id
                 WHERE kb.id = kanban_cards.board_id AND wm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM kanban_boards kb JOIN workspace_members wm ON wm.workspace_id = kb.workspace_id
                      WHERE kb.id = kanban_cards.board_id AND wm.user_id = auth.uid()));


-- ────────────────────────────────────────────────────────────
-- GRANTS
-- (o snapshot só enxerga grants dados pelo role postgres; os
-- defaults do Supabase cobrem anon/service_role)
-- ────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings          TO authenticated;
GRANT ALL ON public.kanban_boards  TO authenticated;
GRANT ALL ON public.kanban_columns TO authenticated;
GRANT ALL ON public.kanban_cards   TO authenticated;
