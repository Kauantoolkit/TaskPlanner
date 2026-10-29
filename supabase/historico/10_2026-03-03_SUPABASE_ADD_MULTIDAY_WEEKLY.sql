-- ============================================
-- ADICIONAR COLUNA PARA RECORRÊNCIA SEMANAL EM MÚLTIPLOS DIAS
-- ============================================

-- Adicionar coluna recurring_days (array de dias da semana: 0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
-- Formato: JSONB array, ex: [1, 4] para segunda e quinta
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring_days JSONB DEFAULT '[]'::jsonb;

-- Criar índice para a nova coluna
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_days ON tasks USING gin(recurring_days);

-- Confirmação
SELECT 'Coluna recurring_days adicionada com sucesso!' AS mensagem;
