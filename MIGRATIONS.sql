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
