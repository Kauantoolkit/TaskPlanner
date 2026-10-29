-- Testes da 0001. Rodar com supabase/tests/run.sh.
-- Cada bloco falha (RAISE) se o comportamento não for o esperado.
\set ON_ERROR_STOP 1
\o /dev/null

-- Dados: dono A com um workspace e uma tarefa; B e C sem vínculo.
INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'dono@x.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'estranho@x.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'convidado@x.com');

CREATE FUNCTION pg_temp.login(p uuid) RETURNS void LANGUAGE sql AS
  $$ SELECT set_config('request.jwt.claim.sub', p::text, false) $$;

-- ── Fluxos legítimos ─────────────────────────────────────────
SET ROLE authenticated;
SELECT pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');

CREATE TEMP TABLE ws ON COMMIT PRESERVE ROWS AS
  SELECT * FROM public.create_workspace('Família', 'family');

DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM ws;
  IF r.member_id IS NULL THEN RAISE EXCEPTION 'create_workspace não criou a linha de owner'; END IF;
  IF r.invite_code !~ '^[2-9A-HJ-NP-Z]{8}$' THEN RAISE EXCEPTION 'código fora do formato: %', r.invite_code; END IF;
  IF (SELECT role FROM public.workspace_members WHERE id = r.member_id) <> 'owner' THEN
    RAISE EXCEPTION 'criador não ficou como owner';
  END IF;
END $$;

INSERT INTO public.tasks (workspace_id, assigned_to_id, created_by_id, text)
  SELECT workspace_id, member_id, member_id, 'tarefa privada' FROM ws;

-- Caminho antigo do front (insert direto + linha de owner) continua funcionando
DO $$
DECLARE v uuid;
BEGIN
  INSERT INTO public.workspaces (name, type, owner_id) VALUES ('Legado', 'personal', auth.uid()) RETURNING id INTO v;
  INSERT INTO public.workspace_members (workspace_id, user_id, role, name, email)
    VALUES (v, auth.uid(), 'owner', 'dono', 'dono@x.com');
END $$;

-- ── Ataques que funcionavam antes ────────────────────────────
SELECT pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');

-- 1) estranho se insere direto (como owner e como member)
DO $$
DECLARE v_ws uuid := (SELECT workspace_id FROM ws);
BEGIN
  BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role, name, email)
      VALUES (v_ws, auth.uid(), 'owner', 'x', 'x');
    RAISE EXCEPTION 'FALHA: estranho entrou como owner sem convite';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role, name, email)
      VALUES (v_ws, auth.uid(), 'member', 'x', 'x');
    RAISE EXCEPTION 'FALHA: estranho entrou como member sem convite';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- 2) estranho não vê tarefas nem membros
DO $$ BEGIN
  IF (SELECT count(*) FROM public.tasks) <> 0 THEN RAISE EXCEPTION 'FALHA: estranho vê tarefas'; END IF;
  IF (SELECT count(*) FROM public.workspace_members) <> 0 THEN RAISE EXCEPTION 'FALHA: estranho vê membros'; END IF;
END $$;

-- 3) código errado
DO $$ BEGIN
  PERFORM public.join_workspace('ZZZZZZZZ');
  RAISE EXCEPTION 'FALHA: código inválido aceito';
EXCEPTION WHEN no_data_found THEN NULL;
END $$;

-- 4) não regenera o código de workspace alheio
DO $$ BEGIN
  PERFORM public.regenerate_invite_code((SELECT workspace_id FROM ws));
  RAISE EXCEPTION 'FALHA: estranho regenerou o código';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;

-- ── anon ─────────────────────────────────────────────────────
RESET ROLE;
SET ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', false);
DO $$ BEGIN
  BEGIN
    PERFORM public.join_workspace('ZZZZZZZZ');
    RAISE EXCEPTION 'FALHA: anon executa join_workspace';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.get_workspace_members('00000000-0000-0000-0000-000000000000');
    RAISE EXCEPTION 'FALHA: anon executa get_workspace_members';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_workspace_by_invite_code') THEN
    RAISE EXCEPTION 'FALHA: get_workspace_by_invite_code ainda existe';
  END IF;
END $$;
RESET ROLE;

-- ── Convite legítimo ─────────────────────────────────────────
SET ROLE authenticated;
SELECT pg_temp.login('cccccccc-0000-0000-0000-000000000003');

DO $$
DECLARE r record; again record;
BEGIN
  SELECT * INTO r FROM public.join_workspace(lower(' ' || (SELECT invite_code FROM ws) || ' '));
  IF r.workspace_id <> (SELECT workspace_id FROM ws) THEN RAISE EXCEPTION 'join foi pro workspace errado'; END IF;
  IF (SELECT role FROM public.workspace_members WHERE id = r.member_id) <> 'member' THEN
    RAISE EXCEPTION 'convidado não entrou como member';
  END IF;
  -- entrar de novo é idempotente
  SELECT * INTO again FROM public.join_workspace((SELECT invite_code FROM ws));
  IF again.member_id <> r.member_id THEN RAISE EXCEPTION 'join repetido criou outra linha'; END IF;
  -- agora vê a tarefa e os 2 membros
  IF (SELECT count(*) FROM public.tasks) <> 1 THEN RAISE EXCEPTION 'convidado não vê a tarefa'; END IF;
  IF (SELECT count(*) FROM public.workspace_members WHERE workspace_id = r.workspace_id) <> 2 THEN
    RAISE EXCEPTION 'convidado não vê os outros membros';
  END IF;
  -- não vira owner atualizando a própria linha
  UPDATE public.workspace_members SET role = 'owner' WHERE id = r.member_id;
  IF (SELECT role FROM public.workspace_members WHERE id = r.member_id) <> 'member' THEN
    RAISE EXCEPTION 'FALHA: membro se promoveu a owner';
  END IF;
  -- e pode sair sozinho
  DELETE FROM public.workspace_members WHERE id = r.member_id;
  IF EXISTS (SELECT 1 FROM public.workspace_members WHERE id = r.member_id) THEN
    RAISE EXCEPTION 'membro não conseguiu sair';
  END IF;
END $$;

-- Dono regenera o código; o antigo deixa de valer
SELECT pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
DO $$
DECLARE v_old text := (SELECT invite_code FROM ws); v_new text;
BEGIN
  v_new := public.regenerate_invite_code((SELECT workspace_id FROM ws));
  IF v_new = v_old OR v_new !~ '^[2-9A-HJ-NP-Z]{8}$' THEN RAISE EXCEPTION 'regenerate_invite_code inválido: %', v_new; END IF;
END $$;
RESET ROLE;

\o
\echo 'OK: 0001_seguranca_workspaces'
