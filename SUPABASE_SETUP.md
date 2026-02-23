# 🔧 Configuração do Supabase

Este guia mostra como configurar o Supabase para ter **autenticação real** e **dados na nuvem**.

---

## 📋 Pré-requisitos

1. Conta no [Supabase](https://supabase.com) (gratuita)
2. Projeto criado no Supabase

---

## 1️⃣ Executar SQL no Supabase

No painel do Supabase, vá em **SQL Editor** e execute este script:

```sql
-- ============================================
-- TABELAS PRINCIPAIS
-- ============================================

-- Workspaces (famílias/empresas)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('family', 'business', 'personal')),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membros dos workspaces
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Tarefas
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  assigned_to_id UUID NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  created_by_id UUID NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  is_permanent BOOLEAN DEFAULT FALSE,
  is_delivery BOOLEAN DEFAULT FALSE,
  delivery_date DATE,
  date DATE NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorias
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

-- Configurações
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, key)
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to_id);
CREATE INDEX idx_tasks_date ON tasks(date);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_categories_workspace ON categories(workspace_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Ativar RLS em todas as tabelas
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies para WORKSPACES
CREATE POLICY "Users can view their workspaces"
  ON workspaces FOR SELECT
  USING (
    owner_id = auth.uid() OR
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their workspaces"
  ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their workspaces"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- Policies para WORKSPACE_MEMBERS
CREATE POLICY "Users can view members of their workspaces"
  ON workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

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

-- Policies para TASKS
CREATE POLICY "Users can view tasks in their workspaces"
  ON tasks FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their workspaces"
  ON tasks FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks in their workspaces"
  ON tasks FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policies para CATEGORIES
CREATE POLICY "Users can view categories in their workspaces"
  ON categories FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage categories in their workspaces"
  ON categories FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policies para SETTINGS
CREATE POLICY "Users can view settings in their workspaces"
  ON settings FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage settings in their workspaces"
  ON settings FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGERS PARA AUTO-UPDATE
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

---

## 2️⃣ Configurar credenciais no projeto

1. No Supabase, vá em **Settings → API**
2. Copie:
   - **Project URL** (exemplo: `https://xxxxx.supabase.co`)
   - **anon/public key** (começa com `eyJhbGc...`)

3. Crie o arquivo `.env` na **raiz do projeto**:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**⚠️ IMPORTANTE:**
- O arquivo `.env` deve estar na **raiz do projeto** (mesmo lugar que `package.json`)
- **Não use aspas** nas variáveis
- **Reinicie o servidor** após criar o arquivo (Ctrl+C e `npm run dev`)

---

## 3️⃣ Configurar autenticação (opcional)

### 🔓 Desabilitar confirmação de email (DESENVOLVIMENTO)

**⚠️ IMPORTANTE para desenvolvimento/testes:**

Por padrão, o Supabase exige que usuários confirmem o email antes de fazer login. Para facilitar o desenvolvimento:

1. No Supabase, vá em **Authentication → Providers → Email**
2. **DESABILITE** a opção **"Confirm email"**
3. Clique em **Save**

Agora você pode criar contas e fazer login imediatamente, sem precisar confirmar o email! ✅

**⚠️ Em produção:** Habilite novamente para segurança.

### Login com Google (opcional)

1. No Supabase, vá em **Authentication → Providers**
2. Ative **Google**
3. Configure com suas credenciais do Google Cloud Console

### Configurações de email

1. No Supabase, vá em **Authentication → Email Templates**
2. Personalize os templates de confirmação/reset de senha

---

## ✅ Verificar se funcionou

No console do navegador (F12), você deve ver:

```
🔍 DEBUG SUPABASE:
URL: ✅ https://xxxxx.supabase.co...
KEY: ✅ eyJhbGciOiJIUzI1NiI...
isSupabaseConfigured: true
```

Se ver isso, **está funcionando!** 🎉

A tela de login deve aparecer automaticamente.

---

## 🔄 Voltar para modo LOCAL

Para desativar o Supabase e voltar ao modo local:

1. Renomeie `.env` para `.env.backup`
2. Reinicie o servidor

---

## 🐛 Troubleshooting

### ⏱️ Erro 429 - "Too Many Requests"
Se receber o erro "Too Many Requests" ao tentar criar conta:
- ✅ **Aguarde 5-10 minutos** e tente novamente (bloqueio temporário)
- ✅ **Limpe os dados do site**: DevTools (F12) → Application → Clear site data
- ✅ **Use outro email** para testar
- ✅ **Não clique várias vezes** no botão de criar conta

Este erro acontece quando há muitas tentativas de registro em pouco tempo (proteção anti-spam do Supabase).

### Variáveis não estão sendo lidas
- ✅ Verifique se `.env` está na raiz (ao lado de `package.json`)
- ✅ Reinicie o servidor (Ctrl+C e `npm run dev`)
- ✅ Não use aspas: `VITE_SUPABASE_URL=https://...` (não `VITE_SUPABASE_URL=\"https://...\"`)

---

## 📚 Próximos passos

Depois de configurar:

1. ✅ Crie uma conta (primeiro usuário será o dono do workspace)
2. ✅ Crie um workspace
3. ✅ Adicione membros
4. ✅ Crie tarefas e atribua aos membros

---

**Dúvidas?** Consulte a [documentação do Supabase](https://supabase.com/docs)