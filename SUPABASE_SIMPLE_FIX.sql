-- ============================================
-- CORREÇÃO SIMPLES: só adiciona a coluna faltante
-- ============================================

-- Adicionar coluna completed_dates na tabela tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_dates DATE[];

-- Confirmar
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'completed_dates';

SELECT '✅ Coluna completed_dates adicionada com sucesso!' AS mensagem;
