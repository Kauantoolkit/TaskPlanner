-- Testes da 0002: conversão dos dados antigos + novas regras.
\set ON_ERROR_STOP 1
\o /dev/null

-- ── Conversão (como superusuário, olhando tudo) ──────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('70000000-0000-0000-0000-000000000001', 'once',     NULL::smallint[], '2026-03-10'::date, NULL::date,   'c1000000-0000-0000-0000-000000000000'::uuid),
      ('70000000-0000-0000-0000-000000000002', 'daily',    '{}',             NULL,               NULL,         'c2000000-0000-0000-0000-000000000000'),
      ('70000000-0000-0000-0000-000000000003', 'weekly',   '{1,4}',          NULL,               NULL,         NULL),
      ('70000000-0000-0000-0000-000000000004', 'weekly',   '{2,3}',          NULL,               NULL,         NULL),
      ('70000000-0000-0000-0000-000000000005', 'weekly',   '{5}',            NULL,               NULL,         NULL),
      ('70000000-0000-0000-0000-000000000006', 'once',     '{}',             '2026-03-07',       NULL,         NULL),
      ('70000000-0000-0000-0000-000000000007', 'delivery', '{}',             NULL,               '2026-04-01', NULL),
      ('70000000-0000-0000-0000-000000000008', 'once',     '{}',             '2026-03-08',       NULL,         NULL)
    ) AS e(id, kind, days, dt, ddate, cat)
  LOOP
    PERFORM 1 FROM public.tasks t
     WHERE t.id = r.id::uuid AND t.kind = r.kind
       AND (r.days IS NULL OR t.recurring_days = r.days)
       AND t.date IS NOT DISTINCT FROM r.dt
       AND t.delivery_date IS NOT DISTINCT FROM r.ddate
       AND t.category_id IS NOT DISTINCT FROM r.cat;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'conversão errada para %: %', r.id,
        (SELECT row_to_json(t) FROM public.tasks t WHERE t.id = r.id::uuid);
    END IF;
  END LOOP;

  IF (SELECT completed_dates FROM public.tasks WHERE id = '70000000-0000-0000-0000-000000000002')
     <> '{2026-03-01,2026-03-02}' THEN RAISE EXCEPTION 'completed_dates perdido'; END IF;
  IF (SELECT completed FROM public.tasks WHERE id = '70000000-0000-0000-0000-000000000002') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'completed nulo não virou false'; END IF;

  -- dono órfão ganhou linha de membro
  IF NOT EXISTS (SELECT 1 FROM public.workspace_members
                  WHERE workspace_id = '33333333-0000-0000-0000-000000000000' AND role = 'owner' AND name = 'Dora') THEN
    RAISE EXCEPTION 'owner órfão sem linha em workspace_members'; END IF;

  -- preferências herdadas ({"value": true} e false puro)
  PERFORM 1 FROM public.user_preferences
   WHERE user_id = 'dddddddd-0000-0000-0000-000000000004'
     AND dark_mode AND NOT sort_by_time AND show_completed AND confirm_delete;
  IF NOT FOUND THEN RAISE EXCEPTION 'preferências não migradas: %',
    (SELECT row_to_json(p) FROM public.user_preferences p WHERE user_id = 'dddddddd-0000-0000-0000-000000000004'); END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    RAISE EXCEPTION 'update_updated_at_column ainda existe'; END IF;
  IF (SELECT count(*) FROM pg_policies WHERE tablename LIKE 'kanban_%') <> 3 THEN
    RAISE EXCEPTION 'policies de kanban duplicadas'; END IF;
END $$;

-- ── Regras novas (como usuário) ──────────────────────────────
CREATE FUNCTION pg_temp.login(p uuid) RETURNS void LANGUAGE sql AS
  $$ SELECT set_config('request.jwt.claim.sub', p::text, false) $$;
SET ROLE authenticated;
SELECT pg_temp.login('dddddddd-0000-0000-0000-000000000004');

DO $$
DECLARE
  v_ws  uuid := '22222222-0000-0000-0000-000000000000';
  v_me  uuid := 'd0000000-0000-0000-0000-00000000000d';
  v_alien_member uuid := (SELECT id FROM public.workspace_members
                           WHERE workspace_id = '33333333-0000-0000-0000-000000000000');
BEGIN
  -- CHECKs por tipo
  BEGIN
    INSERT INTO public.tasks (workspace_id, assigned_to_id, created_by_id, text, kind)
      VALUES (v_ws, v_me, v_me, 'única sem data', 'once');
    RAISE EXCEPTION 'FALHA: once sem date aceito';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.tasks (workspace_id, assigned_to_id, created_by_id, text, kind)
      VALUES (v_ws, v_me, v_me, 'semanal sem dias', 'weekly');
    RAISE EXCEPTION 'FALHA: weekly sem dias aceito';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.tasks (workspace_id, assigned_to_id, created_by_id, text, kind, recurring_days)
      VALUES (v_ws, v_me, v_me, 'dia 7', 'weekly', '{7}');
    RAISE EXCEPTION 'FALHA: dia da semana 7 aceito';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- responsável de outro workspace
  BEGIN
    INSERT INTO public.tasks (workspace_id, assigned_to_id, created_by_id, text, kind)
      VALUES (v_ws, v_alien_member, v_me, 'atribuída fora', 'daily');
    RAISE EXCEPTION 'FALHA: responsável de outro workspace aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- categoria de outro workspace
  INSERT INTO public.categories (id, workspace_id, name, color)
    VALUES ('c9000000-0000-0000-0000-000000000000', '33333333-0000-0000-0000-000000000000', 'Outra', 'x');
  BEGIN
    UPDATE public.tasks SET category_id = 'c9000000-0000-0000-0000-000000000000'
     WHERE id = '70000000-0000-0000-0000-000000000002';
    RAISE EXCEPTION 'FALHA: categoria de outro workspace aceita';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;

  -- apagar categoria limpa a tarefa
  DELETE FROM public.categories WHERE id = 'c2000000-0000-0000-0000-000000000000';
  IF (SELECT category_id FROM public.tasks WHERE id = '70000000-0000-0000-0000-000000000002') IS NOT NULL THEN
    RAISE EXCEPTION 'apagar categoria não limpou a tarefa'; END IF;

  -- logs diários: um por dia, upsert
  INSERT INTO public.task_daily_logs (task_id, log_date, description, author_id)
    VALUES ('70000000-0000-0000-0000-000000000007', '2026-03-20', 'v1', v_me);
  INSERT INTO public.task_daily_logs (task_id, log_date, description, author_id)
    VALUES ('70000000-0000-0000-0000-000000000007', '2026-03-20', 'v2', v_me)
    ON CONFLICT ON CONSTRAINT task_daily_logs_task_date_key DO UPDATE SET description = excluded.description;
  IF (SELECT description FROM public.task_daily_logs WHERE task_id = '70000000-0000-0000-0000-000000000007') <> 'v2' THEN
    RAISE EXCEPTION 'upsert do log falhou'; END IF;

  -- preferências: só as minhas
  UPDATE public.user_preferences SET dark_mode = false;
  IF (SELECT count(*) FROM public.user_preferences) <> 1 THEN RAISE EXCEPTION 'vejo preferências alheias'; END IF;

  -- settings virou só leitura
  BEGIN
    UPDATE public.settings SET value = 'true' WHERE workspace_id = v_ws;
    RAISE EXCEPTION 'FALHA: settings ainda gravável';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- Estranho (B, da 0001) não vê logs nem preferências da Dora
SELECT pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.task_daily_logs) <> 0 THEN RAISE EXCEPTION 'FALHA: estranho vê logs'; END IF;
  IF (SELECT count(*) FROM public.user_preferences) <> 0 THEN RAISE EXCEPTION 'FALHA: estranho vê preferências'; END IF;
  BEGIN
    INSERT INTO public.task_daily_logs (task_id, log_date, description)
      VALUES ('70000000-0000-0000-0000-000000000007', '2026-03-21', 'intruso');
    RAISE EXCEPTION 'FALHA: estranho escreveu log';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

\o
\echo 'OK: 0002_modelo_de_tarefas'
