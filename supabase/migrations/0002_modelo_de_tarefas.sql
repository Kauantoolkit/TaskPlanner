-- ============================================================
-- 0002 — Modelo de dados das tarefas
--
-- * tasks.kind ('once' | 'daily' | 'weekly' | 'delivery') no lugar
--   da combinação is_permanent / is_delivery / recurring_type /
--   recurring_day, com CHECKs garantindo os campos de cada tipo.
-- * recurring_days: jsonb → smallint[] (0 = domingo … 6 = sábado).
-- * tasks.category (texto solto, às vezes UUID, às vezes nome) →
--   tasks.category_id com FK; apagar categoria limpa as tarefas.
-- * task_daily_logs: o "o que avancei hoje" das entregas. Antes só
--   existia na memória do navegador e sumia ao recarregar.
-- * user_preferences: preferências por usuário (antes eram por
--   workspace, em linhas chave/valor). A tabela settings fica até a
--   fase de limpeza, só para leitura em caso de rollback.
-- * Policies reescritas sem duplicatas, todas via
--   get_my_workspace_ids(); tarefa só pode ser atribuída a membro do
--   mesmo workspace.
-- * Uma função de updated_at só.
--
-- Transação única: se algum dado de produção não couber nos novos
-- CHECKs, nada é aplicado e o erro diz qual constraint falhou.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 0. Todo dono de workspace tem linha em workspace_members
--    (as policies abaixo deixam de ter o atalho "OR owner_id = …")
-- ────────────────────────────────────────────────────────────

INSERT INTO public.workspace_members (workspace_id, user_id, role, name, email)
SELECT w.id, w.owner_id, 'owner',
       COALESCE(NULLIF(u.raw_user_meta_data->>'name', ''), split_part(u.email, '@', 1), 'Usuário'),
       COALESCE(u.email, '')
  FROM public.workspaces w
  JOIN auth.users u ON u.id = w.owner_id
ON CONFLICT ON CONSTRAINT workspace_members_workspace_id_user_id_key DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 1. Tipo da tarefa
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.tasks ADD COLUMN kind text;

-- Versões antigas do front gravavam recurring_days com JSON.stringify,
-- então há linhas com a string '"[1,4]"' em vez do array [1,4]
UPDATE public.tasks
   SET recurring_days = (recurring_days #>> '{}')::jsonb
 WHERE jsonb_typeof(recurring_days) = 'string';

-- Ordem de precedência igual à do front antigo (AddTaskModal.getTaskTypeFromTask)
UPDATE public.tasks SET kind = CASE
  WHEN is_delivery AND delivery_date IS NOT NULL THEN 'delivery'
  WHEN is_permanent                              THEN 'daily'
  WHEN recurring_type = 'weekly'
       AND jsonb_typeof(recurring_days) = 'array'
       AND jsonb_array_length(recurring_days) > 0 THEN 'weekly'
  WHEN recurring_type = 'weekly' AND recurring_day IS NOT NULL THEN 'weekly'
  ELSE 'once'
END;

-- recurring_day (1 dia só, legado) vira recurring_days
UPDATE public.tasks
   SET recurring_days = jsonb_build_array(recurring_day)
 WHERE kind = 'weekly'
   AND recurring_day IS NOT NULL
   AND (recurring_days IS NULL OR jsonb_typeof(recurring_days) <> 'array' OR jsonb_array_length(recurring_days) = 0);

-- Tarefa única sem data (não deveria existir; o front sempre mandava hoje)
UPDATE public.tasks SET date = created_at::date WHERE kind = 'once' AND date IS NULL;

ALTER TABLE public.tasks
  ALTER COLUMN kind SET NOT NULL,
  ADD CONSTRAINT tasks_kind_check CHECK (kind IN ('once', 'daily', 'weekly', 'delivery'));


-- ────────────────────────────────────────────────────────────
-- 2. recurring_days: jsonb → smallint[]
-- ────────────────────────────────────────────────────────────

CREATE FUNCTION pg_temp.jsonb_to_weekdays(j jsonb) RETURNS smallint[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(array_agg(DISTINCT x::smallint ORDER BY x::smallint), '{}')
    FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(j) = 'array' THEN j ELSE '[]'::jsonb END) AS x
$$;

DROP INDEX IF EXISTS public.idx_tasks_recurring_days;
ALTER TABLE public.tasks ALTER COLUMN recurring_days DROP DEFAULT;
ALTER TABLE public.tasks
  ALTER COLUMN recurring_days TYPE smallint[] USING pg_temp.jsonb_to_weekdays(recurring_days);
UPDATE public.tasks SET recurring_days = '{}' WHERE recurring_days IS NULL OR kind <> 'weekly';
ALTER TABLE public.tasks
  ALTER COLUMN recurring_days SET DEFAULT '{}',
  ALTER COLUMN recurring_days SET NOT NULL,
  ADD CONSTRAINT tasks_recurring_days_check CHECK (recurring_days <@ '{0,1,2,3,4,5,6}'::smallint[]);


-- ────────────────────────────────────────────────────────────
-- 3. Campos obrigatórios por tipo
-- ────────────────────────────────────────────────────────────

-- Campos que não pertencem ao tipo ficam nulos (eram lixo: o front
-- antigo gravava "hoje" em `date` de toda tarefa)
UPDATE public.tasks SET date = NULL          WHERE kind <> 'once';
UPDATE public.tasks SET delivery_date = NULL WHERE kind <> 'delivery';

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_kind_fields_check CHECK (
    CASE kind
      WHEN 'once'     THEN date IS NOT NULL
      WHEN 'daily'    THEN true
      WHEN 'weekly'   THEN cardinality(recurring_days) > 0
      WHEN 'delivery' THEN delivery_date IS NOT NULL
    END
  );

ALTER TABLE public.tasks ALTER COLUMN completed       SET DEFAULT false;
UPDATE public.tasks SET completed = false WHERE completed IS NULL;
ALTER TABLE public.tasks ALTER COLUMN completed       SET NOT NULL;
UPDATE public.tasks SET completed_dates = '{}' WHERE completed_dates IS NULL;
ALTER TABLE public.tasks ALTER COLUMN completed_dates SET DEFAULT '{}';
ALTER TABLE public.tasks ALTER COLUMN completed_dates SET NOT NULL;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_duration_check CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0),
  ADD CONSTRAINT tasks_yellow_alert_check CHECK (yellow_alert_minutes IS NULL OR yellow_alert_minutes >= 0);

-- Colunas substituídas por `kind`
DROP INDEX IF EXISTS public.idx_tasks_recurring_day;
DROP INDEX IF EXISTS public.idx_tasks_recurring_type;
ALTER TABLE public.tasks
  DROP COLUMN is_permanent,
  DROP COLUMN is_delivery,
  DROP COLUMN recurring_type,
  DROP COLUMN recurring_day;

CREATE INDEX idx_tasks_workspace_kind ON public.tasks (workspace_id, kind);


-- ────────────────────────────────────────────────────────────
-- 4. Categoria com FK
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.tasks ADD COLUMN category_id uuid;

-- O texto antigo às vezes é o UUID, às vezes o nome da categoria
UPDATE public.tasks t
   SET category_id = c.id
  FROM public.categories c
 WHERE c.workspace_id = t.workspace_id
   AND (c.id::text = t.category OR lower(c.name) = lower(t.category));

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.tasks DROP COLUMN category;
CREATE INDEX idx_tasks_category ON public.tasks (category_id);

-- Categoria e tarefa precisam ser do mesmo workspace
CREATE OR REPLACE FUNCTION public.check_task_category_workspace()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.categories c
     WHERE c.id = NEW.category_id AND c.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'Categoria % não pertence ao workspace da tarefa', NEW.category_id
      USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tasks_check_category
  BEFORE INSERT OR UPDATE OF category_id, workspace_id ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.check_task_category_workspace();


-- ────────────────────────────────────────────────────────────
-- 5. Logs diários das entregas
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.task_daily_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  log_date    date NOT NULL,
  description text NOT NULL CHECK (length(trim(description)) > 0),
  author_id   uuid REFERENCES public.workspace_members(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_daily_logs_task_date_key UNIQUE (task_id, log_date)
);

ALTER TABLE public.task_daily_logs ENABLE ROW LEVEL SECURITY;

-- O subselect em tasks já passa pelo RLS de tasks: só tarefas dos meus workspaces
CREATE POLICY daily_logs_all ON public.task_daily_logs
  FOR ALL TO authenticated
  USING      (task_id IN (SELECT t.id FROM public.tasks t))
  WITH CHECK (task_id IN (SELECT t.id FROM public.tasks t));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_daily_logs TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 6. Preferências por usuário
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.user_preferences (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  dark_mode      boolean NOT NULL DEFAULT false,
  show_completed boolean NOT NULL DEFAULT true,
  confirm_delete boolean NOT NULL DEFAULT true,
  sort_by_time   boolean NOT NULL DEFAULT true,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY prefs_own ON public.user_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;

-- Herda o que cada dono tinha salvo no workspace mais recente dele.
-- O value antigo vem como {"value": x} ou como x puro.
INSERT INTO public.user_preferences (user_id, dark_mode, show_completed, confirm_delete, sort_by_time)
SELECT DISTINCT ON (w.owner_id)
       w.owner_id,
       COALESCE((SELECT COALESCE(s.value->'value', s.value)::boolean FROM public.settings s WHERE s.workspace_id = w.id AND s.key = 'darkMode'),      false),
       COALESCE((SELECT COALESCE(s.value->'value', s.value)::boolean FROM public.settings s WHERE s.workspace_id = w.id AND s.key = 'showCompleted'), true),
       COALESCE((SELECT COALESCE(s.value->'value', s.value)::boolean FROM public.settings s WHERE s.workspace_id = w.id AND s.key = 'confirmDelete'), true),
       COALESCE((SELECT COALESCE(s.value->'value', s.value)::boolean FROM public.settings s WHERE s.workspace_id = w.id AND s.key = 'sortByTime'),    true)
  FROM public.workspaces w
 WHERE EXISTS (SELECT 1 FROM public.settings s WHERE s.workspace_id = w.id)
 ORDER BY w.owner_id, (SELECT max(s.updated_at) FROM public.settings s WHERE s.workspace_id = w.id) DESC NULLS LAST
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE public.settings IS 'OBSOLETA desde 0002: substituída por user_preferences. Será removida na fase de limpeza.';


-- ────────────────────────────────────────────────────────────
-- 7. updated_at: uma função só
-- ────────────────────────────────────────────────────────────

DROP TRIGGER trg_kanban_boards_updated_at  ON public.kanban_boards;
DROP TRIGGER trg_kanban_columns_updated_at ON public.kanban_columns;
DROP TRIGGER trg_kanban_cards_updated_at   ON public.kanban_cards;
DROP FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_kanban_boards_updated_at  BEFORE UPDATE ON public.kanban_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_kanban_columns_updated_at BEFORE UPDATE ON public.kanban_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_kanban_cards_updated_at   BEFORE UPDATE ON public.kanban_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_task_daily_logs_updated_at BEFORE UPDATE ON public.task_daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ────────────────────────────────────────────────────────────
-- 8. Policies: uma por operação, sem duplicatas
-- ────────────────────────────────────────────────────────────

-- tasks
DROP POLICY "Users can view tasks in their workspaces"   ON public.tasks;
DROP POLICY "Members can create tasks"                   ON public.tasks;
DROP POLICY "Users can update tasks in their workspaces" ON public.tasks;
DROP POLICY "Users can delete tasks in their workspaces" ON public.tasks;

CREATE POLICY tasks_select ON public.tasks FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

-- Criador = eu; responsável = alguém do mesmo workspace
CREATE POLICY tasks_insert ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (SELECT public.get_my_workspace_ids())
    AND created_by_id IN (SELECT m.id FROM public.workspace_members m
                           WHERE m.workspace_id = tasks.workspace_id AND m.user_id = auth.uid())
    AND assigned_to_id IN (SELECT m.id FROM public.workspace_members m
                            WHERE m.workspace_id = tasks.workspace_id)
  );

CREATE POLICY tasks_update ON public.tasks FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT public.get_my_workspace_ids()))
  WITH CHECK (
    workspace_id IN (SELECT public.get_my_workspace_ids())
    AND assigned_to_id IN (SELECT m.id FROM public.workspace_members m
                            WHERE m.workspace_id = tasks.workspace_id)
  );

-- Apagar: quem criou, o responsável ou o dono do workspace (regra que já existia)
CREATE POLICY tasks_delete ON public.tasks FOR DELETE TO authenticated
  USING (
    workspace_id IN (SELECT public.get_my_workspace_ids())
    AND (
      created_by_id  IN (SELECT m.id FROM public.workspace_members m WHERE m.user_id = auth.uid())
      OR assigned_to_id IN (SELECT m.id FROM public.workspace_members m WHERE m.user_id = auth.uid())
      OR workspace_id IN (SELECT w.id FROM public.workspaces w WHERE w.owner_id = auth.uid())
    )
  );

-- categories
DROP POLICY "Users can view categories in their workspaces"   ON public.categories;
DROP POLICY "Users can manage categories in their workspaces" ON public.categories;
CREATE POLICY categories_all ON public.categories FOR ALL TO authenticated
  USING      (workspace_id IN (SELECT public.get_my_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT public.get_my_workspace_ids()));

-- settings (obsoleta): só leitura
DROP POLICY "Users can view settings in their workspaces"   ON public.settings;
DROP POLICY "Users can manage settings in their workspaces" ON public.settings;
CREATE POLICY settings_select ON public.settings FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_my_workspace_ids()));
REVOKE INSERT, UPDATE, DELETE ON public.settings FROM authenticated;

-- kanban: fica o conjunto do KANBAN_MIGRATION.sql (WITH CHECK explícito);
-- sai o criado no painel, que tinha o atalho de owner (coberto pelo passo 0)
DROP POLICY "Users can view boards in their workspaces"     ON public.kanban_boards;
DROP POLICY "Members can create boards in their workspaces" ON public.kanban_boards;
DROP POLICY "Members can update boards in their workspaces" ON public.kanban_boards;
DROP POLICY "Members can delete boards in their workspaces" ON public.kanban_boards;
DROP POLICY "Users can view columns in their boards"        ON public.kanban_columns;
DROP POLICY "Members can manage columns in their boards"    ON public.kanban_columns;
DROP POLICY "Users can view cards in their boards"          ON public.kanban_cards;
DROP POLICY "Members can manage cards in their boards"      ON public.kanban_cards;

-- Responsável do card também precisa ser do workspace do board
CREATE OR REPLACE FUNCTION public.check_card_assignee_workspace()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.assigned_to_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.kanban_boards b
      JOIN public.workspace_members m ON m.workspace_id = b.workspace_id
     WHERE b.id = NEW.board_id AND m.id = NEW.assigned_to_id
  ) THEN
    RAISE EXCEPTION 'Responsável do card não é membro do workspace' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kanban_cards_check_assignee
  BEFORE INSERT OR UPDATE OF assigned_to_id, board_id ON public.kanban_cards
  FOR EACH ROW EXECUTE FUNCTION public.check_card_assignee_workspace();


-- ────────────────────────────────────────────────────────────
-- 9. Grants das funções novas (0001 fechou o default para anon)
-- ────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.check_task_category_workspace() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.check_card_assignee_workspace() FROM anon, public;

COMMIT;
