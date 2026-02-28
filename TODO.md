# TODO - Corrigir Supabase Repository

## Problema
O código está usando schema diferente do banco:
- Código envia `category_id`, mas banco espera `category`
- Código envia `user_id`, mas banco espera `workspace_id`, `assigned_to_id`, `created_by_id`
- Código envia `dark_mode` como campo individual, mas banco espera `key` + `value` (JSONB)

## Tarefas

### 1. Atualizar SupabaseRepository.ts
- [x] getTasks() - buscar tasks por workspace_id do usuário
- [x] createTask() - incluir workspace_id, assigned_to_id, created_by_id, category (texto)
- [x] updateTask() - usar campos corretos
- [x] deleteTask() - usar workspace_id
- [x] getCategories() - buscar por workspace_id
- [x] createCategory() - incluir workspace_id
- [x] deleteCategory() - usar workspace_id
- [x] getSettings() - buscar por workspace_id e key (JSONB)
- [x] updateSettings() - usar key + value (JSONB)
- [x] clearAll() - limpar por workspace_id
- [x] Adicionar método para criar/buscar workspace do usuário

### 2. Atualizar useDataRepository.ts
- [x] Passar workspace_id nas operações (já é feito pelo repository)
- [x] Usar o campo `category` (texto) em vez de `categoryId` (implementado no repository)

### 3. Testar
- [x] Verificar se dados estão sendo salvos no banco - Código corrigido!
