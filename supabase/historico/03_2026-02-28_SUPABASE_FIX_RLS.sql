-- ============================================
-- CORREÇÃO DAS POLICIES RLS
-- Resolve erro 42P17: infinite recursion detected in policy
-- ============================================

-- PRIMEIRO: Deletar as policies antigas que causam recursão
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
-- POLICIES SIMPLIFICADAS PARA WORKSPACES
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
-- POLICIES SIMPLIFICADAS PARA WORKSPACE_MEMBERS
-- Usa workspace_members como base de autorização (evita recursão)
-- ============================================

CREATE POLICY "Users can view members of their workspaces"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owners can add members"
  ON workspace_members FOR INSERT
  WITH CHECK (
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
-- POLICIES SIMPLIFICADAS PARA TASKS
-- Usa workspace_members como base de autorização
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
-- POLICIES SIMPLIFICADAS PARA CATEGORIES
-- Usa workspace_members como base de autorização
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
-- POLICIES SIMPLIFICADAS PARA SETTINGS
-- Usa workspace_members como base de autorização
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
-- PERMISSÕES (GRANTS) PARA USUÁRIOS AUTENTICADOS
-- Resolve erro 42501: permission denied for table
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON settings TO authenticated;

-- Grant para sequences (geradores de UUID)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- CONFIRMAÇÃO
-- ============================================

SELECT 'Policies e permissões corrigidas com sucesso!' AS mensagem;
