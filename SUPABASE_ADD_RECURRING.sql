-- ============================================
-- ADICIONAR COLUNAS PARA RECORRÊNCIA SEMANAL
-- ============================================

-- Adicionar coluna recurring_type (para tasks recorrentes: daily = todos os dias, weekly = dia específico)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring_type TEXT CHECK (recurring_type IN ('daily', 'weekly'));

-- Adicionar coluna recurring_day (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring_day INTEGER CHECK (recurring_day >= 0 AND recurring_day <= 6);

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_type ON tasks(recurring_type);
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_day ON tasks(recurring_day);

-- Confirmação
SELECT 'Colunas de recorrência semanal adicionadas com sucesso!' AS mensagem;
