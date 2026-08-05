USE elixo;

ALTER TABLE pontos_coleta
  ADD COLUMN IF NOT EXISTS exclusao_status ENUM('NENHUMA','PENDENTE') DEFAULT 'NENHUMA' AFTER aprovado_em,
  ADD COLUMN IF NOT EXISTS exclusao_motivo TEXT NULL AFTER exclusao_status,
  ADD COLUMN IF NOT EXISTS exclusao_solicitada_em DATETIME NULL AFTER exclusao_motivo;
