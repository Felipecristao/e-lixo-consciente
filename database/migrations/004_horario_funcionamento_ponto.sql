ALTER TABLE pontos_coleta
  ADD COLUMN IF NOT EXISTS horario_funcionamento VARCHAR(150) NULL AFTER telefone;
