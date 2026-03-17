# Backend Health Check — Issues Found
> Auditoria realizada em 2026-03-17

---

## 1. Constraint duplicada em `settings`

**Tabela:** `settings`
**Problema:** Duas UNIQUE constraints idênticas em `(workspace_id, key)`:
- `settings_workspace_id_key_key` (gerada automaticamente pelo schema original)
- `settings_workspace_key_unique` (adicionada manualmente na migration #2)

**Fix:**
```sql
ALTER TABLE public.settings DROP CONSTRAINT settings_workspace_key_unique;
```

---

## 2. Policy INSERT duplicada em `workspace_members`

**Tabela:** `workspace_members`
**Problema:** Duas policies de INSERT com condição idêntica (`user_id = auth.uid()`):
- `"Members can add themselves"`
- `"authenticated users can join via invite_code"`

Policies permissivas se combinam com OR — duplicatas não causam falha de segurança mas são desnecessárias e confusas.

**Fix:**
```sql
DROP POLICY IF EXISTS "authenticated users can join via invite_code" ON public.workspace_members;
```

---

## 3. Policy SELECT redundante em `categories` e `settings`

**Tabelas:** `categories`, `settings`
**Problema:** Cada tabela tem uma policy `ALL` e uma policy `SELECT` separada com a mesma condição USING. A policy `ALL` já cobre `SELECT` — a policy separada é redundante.

**Fix:**
```sql
DROP POLICY IF EXISTS "Users can view categories in their workspaces" ON public.categories;
DROP POLICY IF EXISTS "Users can view settings in their workspaces" ON public.settings;
```

---

## 4. (Decisão de produto) UPDATE de tasks sem restrição de autoria

**Tabela:** `tasks`
**Situação:** A policy de UPDATE permite que qualquer membro do workspace edite qualquer task — não apenas as próprias.
**Não é bug** se o objetivo for edição colaborativa. Mas se quiser restringir a edição às próprias tasks:

```sql
-- Apenas se quiser restringir — avaliar com base no produto
DROP POLICY IF EXISTS "Users can update tasks in their workspaces" ON public.tasks;

CREATE POLICY "Users can update tasks in their workspaces"
  ON public.tasks FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    AND created_by_id IN (
      SELECT id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
```

---

## Resumo

| # | Tabela | Tipo | Severidade | Resolvido? |
|---|--------|------|------------|------------|
| 1 | `settings` | Constraint duplicada | Baixa | Pendente |
| 2 | `workspace_members` | Policy INSERT duplicada | Baixa | Pendente |
| 3 | `categories` / `settings` | Policy SELECT redundante | Baixa | Pendente |
| 4 | `tasks` | UPDATE sem restrição de autoria | Decisão de produto | Pendente |
