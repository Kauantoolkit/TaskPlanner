# Supabase — schema sob controle

Até 2026-10 o schema foi mudado colando SQL no SQL Editor, com scripts que
foram criados, editados e apagados do repo, além de coisas feitas direto no
painel. Este diretório é a fonte da verdade daqui pra frente.

| Arquivo | Para quê |
|---------|----------|
| `introspect.sql` | Só leitura. Tira uma foto do schema `public` (tabelas, colunas, constraints, índices, policies, funções, triggers, grants) em um JSON |
| `snapshot.json` | Resultado do `introspect.sql` em produção, em 2026-10-29 (sem o corpo das funções, que está no baseline) |
| `migrations/0000_baseline.sql` | Recria produção do zero. **Não rodar em produção**, ele já está lá |
| `migrations/NNNN_*.sql` | Toda mudança nova. Rodar na ordem, uma vez cada, e commitar antes |
| `tests/` | Testes das migrations num Postgres local (`tests/run.sh`) |
| `historico/` | Os SQLs antigos recuperados do git, só para consulta |

### Migrations

| # | Status em produção | O que faz |
|---|--------------------|-----------|
| 0000 | já aplicado (é o retrato de produção) | baseline |
| 0001 | **pendente** | segurança de workspaces: convite validado no servidor, `create_workspace`, `join_workspace` e `regenerate_invite_code`, membros veem uns aos outros e podem sair, funções fechadas para `anon` |

Para aplicar uma pendente: SQL Editor → cole o arquivo → Run → faça o deploy do
front da mesma fase → atualize a coluna "Status" acima.

### Testes

Precisa de um Postgres local (ex.: `docker run -e POSTGRES_HOST_AUTH_METHOD=trust -p 5432:5432 postgres:17`):

```bash
PGHOST=localhost PGUSER=postgres supabase/tests/run.sh
```

O script cria um banco descartável, aplica `_stub_supabase.sql` (imitação
mínima do `auth` do Supabase), todas as migrations e roda os `*.test.sql`.

**Validação do baseline:** aplicado num Postgres limpo e reintrospectado, deu
**0 diferenças** com o `snapshot.json`: colunas, constraints, índices, as 32
policies com o mesmo texto, triggers, grants e as 12 funções.

Para checar se o banco continua batendo com o repo, rode `introspect.sql` de
novo e compare com o `snapshot.json`.

> Limitação: os `grants` do snapshot só mostram o que foi concedido pelo role
> `postgres`. Os grants padrão do Supabase (feitos por `supabase_admin`) não
> aparecem.

---

## Segurança: entrar em workspace sem convite (corrigido na 0001)

No baseline havia 3 policies de INSERT em `workspace_members` que só checavam
`user_id = auth.uid()`. Qualquer usuário logado que soubesse o UUID de um
workspace se inseria nele, inclusive como `owner`. O UUID saía da
`get_workspace_by_invite_code`, que respondia até sem login. Quem não está
logado nunca conseguiu listar workspaces nem tarefas.

A `0001` fecha isso. `tests/0001_seguranca_workspaces.test.sql` cobre os ataques
e os fluxos legítimos. O teste foi conferido ao contrário: recolocando a policy
antiga, ele falha.

---

## O que o snapshot revelou (vs. os SQLs do repo)

**Criado direto no painel, sem SQL no repo:**
- funções `get_my_workspace_ids`, `get_my_workspace_invite_code` (não usada
  pelo front), `get_workspace_by_invite_code` e `get_workspace_members`, todas
  `SECURITY DEFINER`;
- policies de `workspaces` renomeadas (`authenticated_can_create_workspace`,
  `owner_can_*`), com o SELECT passando a usar `get_my_workspace_ids()`;
- `workspace_members`: `"Members can join workspaces"` e `owner_can_remove_members`.
  O SELECT só mostra **a própria linha**, por isso a lista de membros depende
  da RPC. Um membro também não consegue sair do workspace sozinho;
- `tasks`: DELETE só para criador, responsável ou dono; UPDATE também para o dono;
- `kanban_*`: um 2º conjunto de policies (`"... in their boards"`) sobreposto
  ao do `KANBAN_MIGRATION.sql`. É redundante, mas não causa problema.

**`MIGRATIONS.sql` foi aplicado só em partes:**
- #1 (`date` nullable): aplicado;
- #2 (2ª unique em settings): **não** aplicado. Só existe a original, o que está certo;
- #3 (`sortByTime`): provavelmente não (9 linhas de settings para 7 workspaces).
  Sem impacto, porque o front usa `true` como padrão;
- #4: coluna, unique e a policy de join aplicados. A policy
  `"anyone can read workspace by invite_code"` (`USING (true)`) **não existe**.

---

## Divergências código ↔ banco (entram no rework)

| Onde | Problema |
|------|----------|
| Membros | `get_workspace_members` retorna `id` (= `workspace_members.id`) e `user_id`, mas o front usa `user_id` como `id`. Como `tasks.assigned_to_id` aponta para `workspace_members.id`, `getMemberById(task.assignedToId)` nunca encontra |
| `tasks.category` (text) | Guarda o **UUID** da categoria, sem FK. `deleteCategory` limpa as tasks por **nome**, então nunca casa e sobram UUIDs órfãos |
| `tasks.date` | `createTask` grava a data de hoje em permanente, semanal e entrega (`?? new Date()`) |
| `tasks.recurring_day` | Legado; substituído por `recurring_days`, mas a coluna e o índice seguem lá |
| `settings` | `value` embrulhado em `{"value": x}`; 4 queries para ler; `upsert` sem `onConflict` |
| Triggers | Duas funções iguais: `update_updated_at` e `update_updated_at_column`; `categories` sem `updated_at` |
| Workspace sem membro | `workspaces` e `workspace_members` são inseridos em 2 chamadas separadas pelo front; se a 2ª falha, o workspace fica órfão (o "workspace vazio fantasma" citado em `WorkspaceContext.tsx`) |
| Mensagens de erro | `SupabaseRepository.getTasks` manda rodar `SUPABASE_FIX_RLS_V2.sql` / `SUPABASE_CREATE.sql`, arquivos que não existem mais |

---

## Histórico (git)

Os 10 SQLs apagados no commit `5b468f8` estão em `historico/`, em ordem
cronológica. Reaplicando todos num Postgres limpo:

| # | Arquivo | Data | Efeito | Reaplicado em ordem |
|---|---------|------|--------|---------------------|
| 01 | SUPABASE_CREATE | 02-28 | Cria as 5 tabelas, RLS, triggers `updated_at` | OK |
| 02 | SUPABASE_RESET | 02-28 | **Dropa tudo** | (não reaplicado) |
| 03 | SUPABASE_FIX_RLS | 02-28 | Troca policies (recursão 42P17), GRANTs | OK |
| 04 | SUPABASE_FIX_RLS_V2 | 03-02 | Troca policies; insere owners em `workspace_members` | OK |
| 05 | SUPABASE_SIMPLE_FIX | 03-02 | `completed_dates DATE[]` | OK |
| 06 | SUPABASE_ADD_COLUMNS | 03-02 | idem | OK |
| 07 | SUPABASE_COMPLETE_FIX | 03-02 | Coluna + policies | **FALHA** após o 04 → rollback |
| 08 | SUPABASE_ADD_RECURRING | 03-03 | `recurring_type`, `recurring_day` | OK |
| 09 | SUPABASE_ADD_TIME_COLUMNS | 03-03 | colunas de horário | OK |
| 10 | SUPABASE_ADD_MULTIDAY_WEEKLY | 03-03 | `recurring_days JSONB` | OK |
| — | `../MIGRATIONS.sql` | 03-16/17 | ver acima: aplicado em partes | — |
| — | `../KANBAN_MIGRATION.sql` | 03-17 | tabelas kanban, triggers, RLS, RPCs | OK |
