-- ============================================
-- CORREÇÃO COMPLETA DAS POLICIES RLS - V2
-- Resolve:
-- 1. Erro 400 ao carregar tasks
-- 2. Owner não consegue criar tasks (RLS)
-- 3. Problemas de SELECT em workspace_members
-- ============================================

-- PRIMEIRO: Deletar as policies antigas
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can update their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can delete their workspaces" ON workspaces;

DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Owners can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can update members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can delete members" ON workspace_members;

DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON tasks;
DROP POLICY IF EXISTS "Members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their workspaces" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their workspaces" ON tasks;

DROP POLICY IF EXISTS "Users can view categories in their workspaces" ON categories;
DROP POLICY IF EXISTS "Users can manage categories in their workspaces" ON categories;

DROP POLICY IF EXISTS "Users can view settings in their workspaces" ON settings;
DROP POLICY IF EXISTS "Users can manage settings in their workspaces" ON settings;

-- ============================================
-- POLICIES PARA WORKSPACES
-- O owner sempre consegue ver seu workspace
-- ============================================

CREATE POLICY "Users can view their workspaces"
  ON workspaces FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their workspaces"
  ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their workspaces"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================
-- POLICIES PARA WORKSPACE_MEMBERS
-- CRÍTICO: O usuário precisa ver TODOS os membros do workspace
-- para que as policies de tasks funcionem
-- ============================================

-- Qualquer usuário autenticado pode ver os membros dos workspaces que é owner OU membro
CREATE POLICY "Users can view members of their workspaces"
  ON workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
    OR
    user_id = auth.uid()
  );

-- Qualquer membro pode se adicionar (para criar tasks)
-- OU o owner pode adicionar membros
CREATE POLICY "Members can add themselves"
  ON workspace_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owners can update members"
  ON workspace_members FOR UPDATE
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owners can delete members"
  ON workspace_members FOR DELETE
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- ============================================
-- POLICIES PARA TASKS
-- O usuário consegue ver/criar tasks se for membro do workspace
-- ============================================

CREATE POLICY "Users can view tasks in their workspaces"
  ON tasks FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their workspaces"
  ON tasks FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks in their workspaces"
  ON tasks FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- POLICIES PARA CATEGORIES
-- ============================================

CREATE POLICY "Users can view categories in their workspaces"
  ON categories FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage categories in their workspaces"
  ON categories FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- POLICIES PARA SETTINGS
-- ============================================

CREATE POLICY "Users can view settings in their workspaces"
  ON settings FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage settings in their workspaces"
  ON settings FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- PERMISSÕES (GRANTS)
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON settings TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- GARANTIR QUE OWNERS ESTEJAM EM WORKSPACE_MEMBERS
-- Executar para todos os workspaces existentes
-- ============================================

INSERT INTO workspace_members (workspace_id, user_id, role, name, email)
SELECT 
  w.id AS workspace_id,
  w.owner_id AS user_id,
  'owner' AS role,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) AS name,
  u.email AS email
FROM workspaces w
JOIN auth.users u ON w.owner_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm 
  WHERE wm.workspace_id = w.id AND wm.user_id = w.owner_id
)
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- ============================================
-- CONFIRMAÇÃO
-- ============================================

SELECT '✅ Policies corrigidas com sucesso!' AS mensagem;
SELECT '✅ Owners foram adicionados aos workspace_members!' AS mensagem;
