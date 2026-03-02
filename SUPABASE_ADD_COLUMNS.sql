-- ============================================
-- ADICIONAR COLUNAS FALTANTES NO BANCO
-- Resolve erro: column tasks.completed_dates does not exist
-- ============================================

-- Adicionar coluna completed_dates na tabela tasks (ARRAY de datas)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_dates DATE[];

-- Verificar se a coluna foi adicionada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

-- Confirmação
SELECT '✅ Colunas adicionadas com sucesso!' AS mensagem;
