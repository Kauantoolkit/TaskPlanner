# Supabase — recuperando o controle do schema

Este diretório existe para responder uma pergunta: **o que de fato está aplicado no banco de produção?**

Até aqui o schema foi mudado colando SQL no SQL Editor do Supabase, com scripts
que foram sendo criados, editados e apagados do repo. Nada registra o que rodou
e o que não rodou. O plano é:

1. **Tirar uma foto do banco real** → `introspect.sql` (só leitura).
2. **Comparar com a reconstrução abaixo**, pra saber o que difere.
3. **Gerar um baseline** (`migrations/0000_baseline.sql`) idêntico ao banco real.
4. A partir daí, **toda mudança vira um arquivo numerado** em `migrations/`, e nada mais é colado direto no painel.

---

## Passo 1 — rodar a introspecção

Supabase → SQL Editor → cole `supabase/introspect.sql` → Run.
Retorna uma linha com um JSON: tabelas, colunas, constraints, índices,
policies RLS, funções/RPCs (com o código-fonte), triggers e grants.
Salve como `supabase/snapshot.json`.

> O script foi testado num Postgres 16 local com o histórico reaplicado.
> Ele não grava nada.

---

## Histórico reconstruído (git)

Todos os SQLs que já existiram no repo, inclusive os 10 apagados no commit
`5b468f8`, estão em `historico/`, prefixados na ordem cronológica dos commits.
Reaplicando todos nessa ordem num Postgres limpo:

| # | Arquivo | Data | Efeito | Reaplicado em ordem |
|---|---------|------|--------|---------------------|
| 01 | SUPABASE_CREATE | 02-28 | Cria as 5 tabelas, RLS, triggers `updated_at` | OK |
| 02 | SUPABASE_RESET | 02-28 | **Dropa tudo.** Se rodou depois de dados existirem, apagou dados | (não reaplicado) |
| 03 | SUPABASE_FIX_RLS | 02-28 | Troca policies (corrige recursão 42P17), GRANTs | OK |
| 04 | SUPABASE_FIX_RLS_V2 | 03-02 | Troca policies de novo; cria `"Members can add themselves"`; insere owners em `workspace_members` | OK |
| 05 | SUPABASE_SIMPLE_FIX | 03-02 | `completed_dates DATE[]` | OK |
| 06 | SUPABASE_ADD_COLUMNS | 03-02 | `completed_dates DATE[]` (idem) | OK |
| 07 | SUPABASE_COMPLETE_FIX | 03-02 | Coluna + policies | **FALHA** se rodado após o 04 (`policy "Members can add themselves" already exists`) → rollback total. Provavelmente nunca teve efeito; também não faria falta |
| 08 | SUPABASE_ADD_RECURRING | 03-03 | `recurring_type`, `recurring_day` + índices | OK |
| 09 | SUPABASE_ADD_TIME_COLUMNS | 03-03 | `scheduled_time`, `estimated_duration_minutes`, `yellow_alert_minutes`, `started_at` | OK |
| 10 | SUPABASE_ADD_MULTIDAY_WEEKLY | 03-03 | `recurring_days JSONB` + índice GIN | OK |
| — | `../MIGRATIONS.sql` | 03-16/17 | `date` nullable, unique em settings, `sortByTime`, `invite_code` + 2 policies | OK |
| — | `../KANBAN_MIGRATION.sql` | 03-17 | 3 tabelas kanban, triggers, RLS, 4 RPCs | OK |

### O que o código usa e **não está em nenhum SQL do repo**

Estas duas RPCs são chamadas por `src/app/context/WorkspaceContext.tsx`, mas
nunca foram commitadas. Ou foram criadas direto no painel, ou não existem
(e a feature falha em silêncio). A introspecção vai mostrar o código delas.

- `get_workspace_members(p_workspace_id)` — lista de membros (as policies do V2
  só deixam um membro ver **a própria linha**, então foi preciso uma RPC
  `SECURITY DEFINER` para contornar isso)
- `get_workspace_by_invite_code(p_code)` — entrar via convite

### Incertezas que só o snapshot resolve

- Se o `RESET` rodou **depois** de dados reais existirem.
- Se as policies de `MIGRATIONS.sql` #4 estão ativas (ver segurança abaixo).
- Se `MIGRATIONS.sql` #1 (`date` nullable) foi aplicado. O código ainda manda
  a data de hoje como fallback, então não dá pra deduzir pelos dados.
- Policies, colunas ou funções criadas direto pela UI do Supabase.

---

## ⚠️ Problema de segurança (urgente se as policies do #4 estiverem ativas)

`MIGRATIONS.sql` #4 criou duas policies que abrem o banco. Reproduzido no
Postgres local, com os GRANTs padrão do Supabase:

1. `"anyone can read workspace by invite_code"` — `USING (true)` sem `TO`:
   **qualquer pessoa, inclusive sem login (anon key, que é pública no bundle),
   lista todos os workspaces com os `invite_code`.**
2. `"authenticated users can join via invite_code"` — só checa
   `user_id = auth.uid()`. O código de convite **não é validado no servidor**.
   Qualquer usuário logado se insere em qualquer workspace, **com
   `role = 'owner'` se quiser**, e passa a ler as tarefas dele.

Teste local: um usuário que não é membro inseriu a si mesmo como `owner` no
workspace de outro e leu `"tarefa privada"`.

A correção (policies fechadas e entrada só via RPC que valida o código) vai no
primeiro migration após o baseline. Se quiser fechar **já**, antes do rework, rode:

```sql
DROP POLICY IF EXISTS "anyone can read workspace by invite_code" ON public.workspaces;
DROP POLICY IF EXISTS "authenticated users can join via invite_code" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can add themselves" ON public.workspace_members;
```

Efeito colateral: "entrar via convite" para de funcionar até a RPC nova
existir, a não ser que `get_workspace_by_invite_code` já seja `SECURITY DEFINER`
e faça o insert ela mesma (o snapshot mostra).

---

## Divergências código ↔ banco (entram no rework)

| Onde | Problema |
|------|----------|
| `tasks.category` (text) | Guarda o **UUID** da categoria, sem FK. `deleteCategory` limpa as tasks por **nome**, então nunca casa e sobram UUIDs órfãos |
| `tasks.assigned_to_id` | Aponta para `workspace_members.id`, mas a lista `members` do front usa `user_id` como `id`, então `getMemberById(task.assignedToId)` não encontra |
| `tasks.date` | `createTask` grava a data de hoje em permanente, semanal e entrega (`?? new Date()`) |
| `tasks.recurring_day` | Legado; substituído por `recurring_days`, mas a coluna e o índice seguem lá |
| `settings` | Duas unique constraints iguais (`settings_workspace_id_key_key` e `settings_workspace_key_unique`); `value` embrulhado em `{"value": x}`; 4 queries para ler |
| Triggers | Duas funções iguais: `update_updated_at` e `update_updated_at_column`; `categories` sem `updated_at` |
| Workspace sem membro | `workspaces` e `workspace_members` são inseridos em 2 chamadas separadas pelo front; se a 2ª falha, o workspace fica órfão (o "workspace vazio fantasma" citado em `WorkspaceContext.tsx`) |
| Mensagens de erro | `SupabaseRepository.getTasks` manda rodar `SUPABASE_FIX_RLS_V2.sql` / `SUPABASE_CREATE.sql`, arquivos que não existem mais |
