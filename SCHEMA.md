# Schema do Banco de Dados (Supabase)

> Gerado em 2026-03-16 para validação com os fluxos do sistema.

---

## Diagrama de Relacionamentos

```
auth.users
    │
    ├──< workspaces (owner_id)
    │         │
    │         ├──< workspace_members (workspace_id) >── auth.users (user_id)
    │         │         │
    │         │         └── tasks.assigned_to_id / tasks.created_by_id
    │         │
    │         ├──< tasks (workspace_id)
    │         ├──< categories (workspace_id)
    │         └──< settings (workspace_id)
```

---

## Tabelas

### `workspaces`
Workspace raiz — cada usuário pode ter ou pertencer a múltiplos workspaces.

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | uuid | PK | `gen_random_uuid()` |
| `name` | text | sim | |
| `type` | text | sim | `'family'` \| `'business'` \| `'personal'` |
| `owner_id` | uuid | FK → `auth.users.id` | dono do workspace |
| `created_at` | timestamptz | | `now()` |
| `updated_at` | timestamptz | | `now()` |

---

### `workspace_members`
Membros de cada workspace. É a entidade que representa um usuário dentro de um workspace.

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | uuid | PK | |
| `workspace_id` | uuid | FK → `workspaces.id` | |
| `user_id` | uuid | FK → `auth.users.id` | |
| `role` | text | sim | `'owner'` \| `'member'` |
| `name` | text | sim | nome de exibição |
| `email` | text | sim | |
| `created_at` | timestamptz | | `now()` |

---

### `tasks`
Tarefas do planner. Suporta múltiplos tipos: única, permanente, semanal, entrega.

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | uuid | PK | |
| `workspace_id` | uuid | FK → `workspaces.id` | |
| `assigned_to_id` | uuid | FK → `workspace_members.id` | responsável |
| `created_by_id` | uuid | FK → `workspace_members.id` | criador |
| `text` | text | sim | conteúdo da tarefa |
| `completed` | boolean | | default `false` |
| `is_permanent` | boolean | | default `false` — aparece todos os dias |
| `is_delivery` | boolean | | default `false` — tem data de entrega |
| `delivery_date` | date | | usado quando `is_delivery = true` |
| `date` | date | **sim** | data da tarefa (obrigatório no schema, mesmo para permanentes) |
| `category` | text | | categoria em texto livre (legado?) |
| `completed_dates` | ARRAY | | datas concluídas — usado por permanentes e semanais |
| `recurring_type` | text | | `'daily'` \| `'weekly'` |
| `recurring_day` | integer | | 0–6 (legado, substituído por `recurring_days`) |
| `recurring_days` | jsonb | | array de dias da semana `[0-6]`, default `'[]'` |
| `scheduled_time` | time | | horário de início |
| `estimated_duration_minutes` | integer | | duração estimada em minutos |
| `yellow_alert_minutes` | integer | | minutos antes do fim para alerta amarelo |
| `started_at` | timestamptz | | quando a tarefa foi iniciada |
| `created_at` | timestamptz | | `now()` |
| `updated_at` | timestamptz | | `now()` |

**Tipos de tarefa (lógica frontend):**

| Tipo | Flags | Aparece em |
|------|-------|-----------|
| Única | `is_permanent=false`, `is_delivery=false`, sem `recurring_type` | Apenas no `date` |
| Permanente | `is_permanent=true` | Todos os dias |
| Semanal | `recurring_type='weekly'`, `recurring_days=[...]` | Nos dias da semana configurados |
| Entrega | `is_delivery=true`, `delivery_date=...` | Do dia atual até `delivery_date` |

---

### `categories`
Categorias de tarefas por workspace.

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | uuid | PK | |
| `workspace_id` | uuid | FK → `workspaces.id` | |
| `name` | text | sim | |
| `color` | text | sim | classes Tailwind (ex: `"bg-blue-500 text-white"`) |
| `created_at` | timestamptz | | `now()` |

---

### `settings`
Configurações do workspace armazenadas como chave-valor JSON.

| Coluna | Tipo | Obrigatório | Notas |
|--------|------|-------------|-------|
| `id` | uuid | PK | |
| `workspace_id` | uuid | FK → `workspaces.id` | |
| `key` | text | sim | ex: `"darkMode"`, `"sortByTime"` |
| `value` | jsonb | sim | valor da configuração |
| `created_at` | timestamptz | | `now()` |
| `updated_at` | timestamptz | | `now()` |

**Chaves conhecidas:**

| key | Tipo do value | Default |
|-----|---------------|---------|
| `darkMode` | boolean | `false` |
| `showCompleted` | boolean | `true` |
| `confirmDelete` | boolean | `true` |
| `sortByTime` | boolean | `true` |

---

## Pontos de Atenção / Possíveis Inconsistências

1. **`tasks.date` é `NOT NULL`** — mas tarefas permanentes, semanais e de entrega não têm data fixa. O frontend envia `undefined` para esses casos; precisa verificar se o Supabase aceita ou exige um valor.

2. **`tasks.category` (text) vs `categories.id` (uuid)** — o schema tem `category text` na tabela tasks, mas o frontend usa `categoryId` (uuid referenciando a tabela `categories`). A coluna `category` parece ser legado; não há FK formal.

3. **`recurring_day` (integer) vs `recurring_days` (jsonb)** — dois campos para a mesma coisa. `recurring_day` é legado (suporta só 1 dia); `recurring_days` é o atual (suporta múltiplos dias).

4. **`assigned_to_id` é `NOT NULL`** — no modo local o frontend envia `''` (string vazia), o que pode causar erro se o Supabase enforçar a FK estritamente.

5. **`settings` como chave-valor** — o frontend trata settings como um objeto único (`Settings`), mas o banco armazena como linhas separadas por `key`. O `SupabaseRepository` precisa fazer a conversão.
