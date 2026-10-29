-- ============================================================
-- 0001 — Segurança de workspaces e membros
--
-- Antes: qualquer usuário logado podia se inserir em qualquer
-- workspace (até como 'owner') sabendo o UUID, e o UUID saía da
-- get_workspace_by_invite_code, que respondia até sem login.
--
-- Depois:
--   * entrar só via join_workspace(code), que valida o código e
--     insere sempre como 'member';
--   * criar workspace via create_workspace(name, type), que cria o
--     workspace + a linha de owner na mesma transação (acaba com o
--     "workspace órfão") e gera o código no servidor;
--   * códigos de convite com 8 caracteres de um alfabeto de 32
--     (~1 trilhão de combinações); os antigos de 6 hex são trocados;
--   * membros enxergam os outros membros do mesmo workspace e podem
--     sair dele; o dono continua sendo o único que remove alguém;
--   * nenhuma função do schema public é executável por anon.
--
-- Rodar no SQL Editor de uma vez (é uma transação só). Fazer o
-- deploy do front desta fase logo em seguida: o front antigo usa
-- get_workspace_by_invite_code, que é removida aqui.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. Código de convite gerado no servidor
-- ────────────────────────────────────────────────────────────

-- 8 caracteres sem ambíguos (sem 0/O, 1/I). Bytes de gen_random_uuid()
-- (aleatório forte); os bytes 6 e 8 carregam versão/variante e são pulados.
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql VOLATILE
SET search_path TO 'public'
AS $$
DECLARE
  v_alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_bytes    bytea := uuid_send(gen_random_uuid());
  v_pos      constant int[] := ARRAY[0, 1, 2, 3, 4, 5, 7, 9];
  v_code     text := '';
  i          int;
BEGIN
  FOREACH i IN ARRAY v_pos LOOP
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  END LOOP;
  RETURN v_code;
END;
$$;

-- Troca os códigos fracos (6 hex, gerados pelo MIGRATIONS.sql antigo).
-- Quem tinha um convite desses antigo precisa pedir o novo.
UPDATE public.workspaces
   SET invite_code = public.generate_invite_code()
 WHERE invite_code IS NULL OR length(invite_code) < 8;


-- ────────────────────────────────────────────────────────────
-- 2. RPCs de workspace
-- ────────────────────────────────────────────────────────────

-- Nome de exibição do usuário logado, igual ao que o front já usava.
CREATE OR REPLACE FUNCTION public._current_user_profile(OUT p_name text, OUT p_email text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(NULLIF(u.raw_user_meta_data->>'name', ''), split_part(u.email, '@', 1), 'Usuário'),
         COALESCE(u.email, '')
    FROM auth.users u
   WHERE u.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.create_workspace(p_name text, p_type text)
RETURNS TABLE (workspace_id uuid, member_id uuid, name text, type text,
               owner_id uuid, invite_code text, created_at timestamptz)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
#variable_conflict use_column
DECLARE
  v_uid    uuid := auth.uid();
  v_ws     public.workspaces%ROWTYPE;
  v_member uuid;
  v_prof   record;
  v_try    int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;
  IF COALESCE(trim(p_name), '') = '' THEN
    RAISE EXCEPTION 'Nome do workspace é obrigatório' USING ERRCODE = '22023';
  END IF;

  LOOP
    BEGIN
      INSERT INTO public.workspaces (name, type, owner_id, invite_code)
      VALUES (trim(p_name), p_type, v_uid, public.generate_invite_code())
      RETURNING * INTO v_ws;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_try := v_try + 1;
      IF v_try >= 5 THEN RAISE; END IF;
    END;
  END LOOP;

  SELECT * INTO v_prof FROM public._current_user_profile();

  INSERT INTO public.workspace_members (workspace_id, user_id, role, name, email)
  VALUES (v_ws.id, v_uid, 'owner', v_prof.p_name, v_prof.p_email)
  RETURNING id INTO v_member;

  RETURN QUERY SELECT v_ws.id, v_member, v_ws.name, v_ws.type,
                      v_ws.owner_id, v_ws.invite_code, v_ws.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_workspace(p_code text)
RETURNS TABLE (workspace_id uuid, member_id uuid, name text, type text,
               owner_id uuid, created_at timestamptz)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
#variable_conflict use_column
DECLARE
  v_uid    uuid := auth.uid();
  v_ws     public.workspaces%ROWTYPE;
  v_member uuid;
  v_prof   record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_ws
    FROM public.workspaces w
   WHERE w.invite_code = upper(trim(p_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código de convite inválido' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_prof FROM public._current_user_profile();

  INSERT INTO public.workspace_members (workspace_id, user_id, role, name, email)
  VALUES (v_ws.id, v_uid, 'member', v_prof.p_name, v_prof.p_email)
  ON CONFLICT ON CONSTRAINT workspace_members_workspace_id_user_id_key DO NOTHING;

  SELECT wm.id INTO v_member
    FROM public.workspace_members wm
   WHERE wm.workspace_id = v_ws.id AND wm.user_id = v_uid;

  RETURN QUERY SELECT v_ws.id, v_member, v_ws.name, v_ws.type,
                      v_ws.owner_id, v_ws.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_workspace_id uuid)
RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code text;
  v_try  int := 0;
BEGIN
  LOOP
    BEGIN
      UPDATE public.workspaces
         SET invite_code = public.generate_invite_code()
       WHERE id = p_workspace_id AND owner_id = auth.uid()
      RETURNING invite_code INTO v_code;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_try := v_try + 1;
      IF v_try >= 5 THEN RAISE; END IF;
    END;
  END LOOP;

  IF v_code IS NULL THEN
    RAISE EXCEPTION 'Só o dono pode gerar um novo código' USING ERRCODE = '42501';
  END IF;
  RETURN v_code;
END;
$$;

-- Substituída por join_workspace (devolvia o UUID do workspace para
-- qualquer um, inclusive sem login).
DROP FUNCTION IF EXISTS public.get_workspace_by_invite_code(text);


-- ────────────────────────────────────────────────────────────
-- 3. Policies de workspace_members
-- ────────────────────────────────────────────────────────────

-- As três só checavam user_id = auth.uid(): entrada livre em qualquer workspace.
DROP POLICY IF EXISTS "Members can add themselves"                   ON public.workspace_members;
DROP POLICY IF EXISTS "Members can join workspaces"                  ON public.workspace_members;
DROP POLICY IF EXISTS "authenticated users can join via invite_code" ON public.workspace_members;

-- Inserção direta: só o dono, só a própria linha de owner, só no próprio
-- workspace. Mantém o fluxo antigo de criação funcionando até o deploy;
-- o caminho normal agora é create_workspace / join_workspace.
CREATE POLICY members_insert_own_owner_row ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND workspace_id IN (SELECT w.id FROM public.workspaces w WHERE w.owner_id = auth.uid())
  );

-- Ver todos os membros dos workspaces de que faço parte
-- (get_my_workspace_ids é SECURITY DEFINER, então não há recursão de RLS).
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON public.workspace_members;
CREATE POLICY members_select_same_workspace ON public.workspace_members
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_my_workspace_ids()));

-- Dono altera membros, sem poder mover a linha para workspace de outro.
DROP POLICY IF EXISTS "Owners can update members" ON public.workspace_members;
CREATE POLICY members_update_by_owner ON public.workspace_members
  FOR UPDATE TO authenticated
  USING      (workspace_id IN (SELECT w.id FROM public.workspaces w WHERE w.owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT w.id FROM public.workspaces w WHERE w.owner_id = auth.uid()));

-- Membro (não-dono) pode sair do workspace por conta própria.
CREATE POLICY members_delete_self ON public.workspace_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND role <> 'owner');


-- ────────────────────────────────────────────────────────────
-- 4. Funções fora do alcance de anon
-- ────────────────────────────────────────────────────────────

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, public;
GRANT  EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- O helper interno não precisa ser chamado pelo front.
REVOKE EXECUTE ON FUNCTION public._current_user_profile() FROM authenticated;

-- Funções criadas daqui pra frente também nascem fechadas para anon.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, public;

COMMIT;
