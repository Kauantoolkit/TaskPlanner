-- ============================================
-- CORREÇÃO COMPLETA DO BANCO DE DADOS
-- Resolve: column tasks.completed_dates does not exist
-- Resolve: RLS policies com problemas
-- Resolve: Owner não está em workspace_members
-- ============================================

-- 1. ADICIONAR COLUNAS FALTANTES
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_dates DATE[];

-- 2. DELETAR POLICIES ANTIGAS
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

-- 3. POLICIES PARA WORKSPACES
CREATE POLICY "Users can view their workspaces" ON workspaces FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create workspaces" ON workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can update their workspaces" ON workspaces FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Owners can delete their workspaces" ON workspaces FOR DELETE USING (owner_id = auth.uid());

-- 4. POLICIES PARA WORKSPACE_MEMBERS
CREATE POLICY "Users can view members of their workspaces" ON workspace_members FOR SELECT USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()) OR user_id = auth.uid()
);
CREATE POLICY "Members can add themselves" ON workspace_members FOR INSERT WITH CHECK (
  user_id = auth.uid() OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);
CREATE POLICY "Owners can update members" ON workspace_members FOR UPDATE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);
CREATE POLICY "Owners can delete members" ON workspace_members FOR DELETE USING (
  workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
);

-- 5. POLICIES PARA TASKS
CREATE POLICY "Users can view tasks in their workspaces" ON tasks FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "Members can create tasks" ON tasks FOR INSERT WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update tasks in their workspaces" ON tasks FOR UPDATE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete tasks in their workspaces" ON tasks FOR DELETE USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- 6. POLICIES PARA CATEGORIES
CREATE POLICY "Users can view categories in their workspaces" ON categories FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage categories in their workspaces" ON categories FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- 7. POLICIES PARA SETTINGS
CREATE POLICY "Users can view settings in their workspaces" ON settings FOR SELECT USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage settings in their workspaces" ON settings FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- 8. PERMISSÕES
GRANT SELECT, INSERT, UPDATE, DELETE ON workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON settings TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 9. GARANTIR OWNERS EM WORKSPACE_MEMBERS
INSERT INTO workspace_members (workspace_id, user_id, role, name, email)
SELECT w.id, w.owner_id, 'owner', COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)), u.email
FROM workspaces w
JOIN auth.users u ON w.owner_id = u.id
WHERE NOT EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = w.id AND wm.user_id = w.owner_id)
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- CONFIRMAÇÃO
SELECT '✅ Correção completa aplicada com sucesso!' AS mensagem;
