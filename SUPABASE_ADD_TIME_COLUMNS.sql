-- ============================================
-- ADICIONAR COLUNAS DE HORÁRIO PARA TAREFAS
-- Sistema de alertavisual com horário de início, duração e alertas
-- ============================================

-- Adicionar coluna scheduled_time (horário de início da tarefa)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_time TIME;

-- Adicionar coluna estimated_duration_minutes (duração estimada em minutos)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;

-- Adicionar coluna yellow_alert_minutes (minutos antes do prazo para alerta amarelo)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS yellow_alert_minutes INTEGER;

-- Adicionar coluna started_at (quando a tarefa foi iniciada/marcada como iniciada)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('scheduled_time', 'estimated_duration_minutes', 'yellow_alert_minutes', 'started_at')
ORDER BY ordinal_position;

-- Confirmação
SELECT '✅ Colunas de horário adicionadas com sucesso!' AS mensagem;
