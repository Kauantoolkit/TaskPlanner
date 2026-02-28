-- ============================================
-- SUPABASE RESET COMPLETO
-- Execute este script primeiro, depois o de criação
-- ============================================

-- 1) Desabilitar temporariamente RLS para poder dropar as políticas
ALTER TABLE IF EXISTS settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspaces DISABLE ROW LEVEL SECURITY;

-- 2) Remover todas as policies do schema public
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

-- 3) Remover triggers (precisam ser removidas antes das functions)
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;

-- 4) Remover functions
DROP FUNCTION IF EXISTS update_updated_at();

-- 5) Remover tabelas na ordem correta (considerando FKs)
-- Tarefas dependem de workspace_members
DROP TABLE IF EXISTS tasks;

-- Categorias dependem de workspaces
DROP TABLE IF EXISTS categories;

-- Settings dependem de workspaces
DROP TABLE IF EXISTS settings;

-- Workspace_members depende de workspaces e auth.users
DROP TABLE IF EXISTS workspace_members;

-- Workspaces depende de auth.users
DROP TABLE IF EXISTS workspaces;

-- 6) Confirmação
SELECT 'Reset completo executado com sucesso!' AS mensagem;
