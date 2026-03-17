-- ============================================================
-- MIGRATIONS — diferenças entre o banco atual e o código
-- Execute no SQL Editor do Supabase na ordem abaixo.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. tasks.date: remover NOT NULL
--
-- Problema: a coluna é NOT NULL no banco, mas tarefas do tipo
-- permanente, semanal e entrega não têm data fixa — o frontend
-- manda NULL. O código contorna com `?? new Date()`, mas isso
-- grava a data de hoje em tarefas que não deveriam ter data,
-- poluindo os dados.
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.tasks
  ALTER COLUMN date DROP NOT NULL;


-- ────────────────────────────────────────────────────────────
-- 2. settings: unique constraint em (workspace_id, key)
--
-- Problema: o código faz UPSERT na tabela settings (um registro
-- por chave por workspace). Sem unique constraint, o Supabase
-- não sabe qual linha atualizar e cria duplicatas a cada save.
-- Duplicatas fazem o maybeSingle() retornar erro e as
-- configurações ficam com valores padrão mesmo após salvar.
--
-- Passo 2a — remover duplicatas existentes (mantém o mais recente)
-- ────────────────────────────────────────────────────────────

DELETE FROM public.settings a
USING public.settings b
WHERE a.workspace_id = b.workspace_id
  AND a.key = b.key
  AND a.updated_at < b.updated_at;

-- Passo 2b — adicionar a constraint
ALTER TABLE public.settings
  ADD CONSTRAINT settings_workspace_key_unique
  UNIQUE (workspace_id, key);


-- ────────────────────────────────────────────────────────────
-- 3. settings: inserir sortByTime para workspaces existentes
--
-- Problema: a chave 'sortByTime' foi adicionada ao código
-- recentemente. Workspaces já existentes não têm essa linha,
-- então caem no fallback false → tasks aparecem sem ordenação.
-- ────────────────────────────────────────────────────────────

INSERT INTO public.settings (workspace_id, key, value)
SELECT id, 'sortByTime', '{"value": true}'::jsonb
FROM public.workspaces
WHERE id NOT IN (
  SELECT workspace_id FROM public.settings WHERE key = 'sortByTime'
);


-- ────────────────────────────────────────────────────────────
-- 4. workspaces.invite_code: adicionar coluna de código de convite
--
-- Problema: o fluxo de gestão de household/empresa exige que membros
-- possam entrar num workspace via código curto. Sem essa coluna,
-- não é possível convidar usuários externos.
--
-- Passo 4a — adicionar a coluna (nullable para workspaces já existentes)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Passo 4b — gerar códigos para workspaces que ainda não têm
UPDATE public.workspaces
  SET invite_code = upper(substring(gen_random_uuid()::text, 1, 6))
  WHERE invite_code IS NULL;

-- Passo 4c — adicionar unique constraint para garantir unicidade
ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_invite_code_unique
  UNIQUE (invite_code);

-- Passo 4d — habilitar RLS policies para workspaces e workspace_members
-- (DROP antes de criar para evitar conflito caso já existam)

DROP POLICY IF EXISTS "anyone can read workspace by invite_code" ON public.workspaces;
CREATE POLICY "anyone can read workspace by invite_code"
  ON public.workspaces
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "authenticated users can join via invite_code" ON public.workspace_members;
CREATE POLICY "authenticated users can join via invite_code"
  ON public.workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- OBSERVAÇÕES (não requerem SQL, só documentação)
-- ────────────────────────────────────────────────────────────

-- A. tasks.category (text) armazena o UUID da categoria, mas não
--    tem FK para public.categories. Se precisar de integridade
--    referencial no futuro, renomear para category_id e adicionar:
--
--    ALTER TABLE public.tasks RENAME COLUMN category TO category_id;
--    ALTER TABLE public.tasks
--      ADD CONSTRAINT tasks_category_id_fkey
--      FOREIGN KEY (category_id) REFERENCES public.categories(id)
--      ON DELETE SET NULL;
--
--    ATENÇÃO: requer atualização no SupabaseRepository (coluna muda
--    de nome no SELECT/INSERT/UPDATE).

-- B. recurring_day (integer, legado) pode ser dropado depois de
--    confirmar que nenhuma task ainda usa esse campo:
--
--    ALTER TABLE public.tasks DROP COLUMN recurring_day;
