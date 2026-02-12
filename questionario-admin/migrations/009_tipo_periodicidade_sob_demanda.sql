-- Formulários "Sob Demanda": não possuem periodicidade.
-- Tornamos o FK nullable para que NULL = sob demanda.
-- Também tornamos NUM_MES_LIMITE nullable (irrelevante para sob demanda).

ALTER TABLE questionario
  MODIFY COLUMN SEQ_TIPO_PERIODICIDADE_PERGUNTA INT NULL,
  MODIFY COLUMN NUM_MES_LIMITE INT NULL;
