# Implementação de Task Recorrente Semanal - COMPLETO

## Alterações Realizadas

### 1. types.ts ✅
- Adicionado campo `recurringType?: 'daily' | 'weekly'`
- Adicionado campo `recurringDay?: number` (0=Domingo, 1=Segunda, etc.)

### 2. SUPABASE_ADD_RECURRING.sql ✅
- Criado arquivo SQL com comandos para adicionar colunas ao banco:
  - `recurring_type` (TEXT)
  - `recurring_day` (INTEGER)
- Criados índices para performance

### 3. AddTaskModal.tsx ✅
- Adicionado novo tipo "Semanal" com seletor de dia da semana
- Interface atualizada com novos campos
- Lógica de submissão atualizada

### 4. App.tsx ✅
- `filteredTasks` atualizado para filtrar tasks semanais pelo dia da semana
- `stats` atualizado para considerar tasks semanais (usam completedDates)
- `handleAddTask` atualizado para incluir recurringType e recurringDay
- `handleUpdateTask` atualizado
- `handleToggleTask` atualizado para usar completedDates em tasks semanais
- Adicionada nova seção "Recorrente Semanal" na UI

### 5. useDataRepository.ts ✅
- Já funciona automaticamente via spread operator do TypeScript

## Para executar no Supabase

Execute o conteúdo do arquivo `SUPABASE_ADD_RECURRING.sql` no seu banco de dados Supabase.
