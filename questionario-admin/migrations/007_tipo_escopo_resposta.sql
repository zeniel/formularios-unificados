-- ============================================================================
-- MIGRACAO: Tabela tipo_escopo_resposta + FK em questionario
-- ============================================================================
-- Cria a tabela de lookup para escopos de resposta (TRIBUNAL, ORGAO, INDIVIDUAL)
-- e adiciona a FK na tabela questionario.
-- ============================================================================

-- PARTE 1: CRIAR TABELA
CREATE TABLE IF NOT EXISTS tipo_escopo_resposta (
    SEQ_TIPO_ESCOPO_RESPOSTA INT NOT NULL AUTO_INCREMENT,
    COD_TIPO_ESCOPO          VARCHAR(20) NOT NULL
        COMMENT 'Codigo unico do escopo. Ex: TRIBUNAL, ORGAO, INDIVIDUAL',
    DSC_TIPO_ESCOPO          VARCHAR(200) NOT NULL
        COMMENT 'Descricao para exibicao na UI',
    DSC_DETALHES             TEXT NULL
        COMMENT 'Texto explicativo opcional',
    PRIMARY KEY (SEQ_TIPO_ESCOPO_RESPOSTA),
    UNIQUE KEY uk_tipo_escopo_cod (COD_TIPO_ESCOPO)
) ENGINE=InnoDB DEFAULT CHARSET=latin1
COMMENT='Tipos de escopo de resposta dos questionarios';

-- PARTE 2: DADOS INICIAIS
INSERT INTO tipo_escopo_resposta (COD_TIPO_ESCOPO, DSC_TIPO_ESCOPO, DSC_DETALHES) VALUES
('TRIBUNAL',   'Por Tribunal',   'Cada tribunal responde uma unica vez ao questionario'),
('ORGAO',      'Por Orgao',      'Cada orgao jurisdicional responde individualmente'),
('INDIVIDUAL', 'Individual',     'Cada usuario responde individualmente');

-- PARTE 3: ADICIONAR COLUNA FK EM QUESTIONARIO (caso ainda nao exista)
-- A coluna SEQ_TIPO_ESCOPO_RESPOSTA ja pode existir no schema mas sem FK no banco.
-- Verifica e adiciona a coluna se necessario.

SET @col_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'questionario'
      AND COLUMN_NAME = 'SEQ_TIPO_ESCOPO_RESPOSTA'
);

SET @sql_add_col = IF(@col_exists = 0,
    'ALTER TABLE questionario ADD COLUMN SEQ_TIPO_ESCOPO_RESPOSTA INT NULL COMMENT ''FK para tipo_escopo_resposta''',
    'SELECT ''Coluna SEQ_TIPO_ESCOPO_RESPOSTA ja existe'' AS info'
);
PREPARE stmt FROM @sql_add_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- PARTE 4: ADICIONAR FK (caso ainda nao exista)
SET @fk_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'questionario'
      AND CONSTRAINT_NAME = 'fk_questionario_tipo_escopo'
);

SET @sql_add_fk = IF(@fk_exists = 0,
    'ALTER TABLE questionario ADD CONSTRAINT fk_questionario_tipo_escopo FOREIGN KEY (SEQ_TIPO_ESCOPO_RESPOSTA) REFERENCES tipo_escopo_resposta(SEQ_TIPO_ESCOPO_RESPOSTA) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT ''FK fk_questionario_tipo_escopo ja existe'' AS info'
);
PREPARE stmt FROM @sql_add_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- PARTE 5: ADICIONAR COLUNA SEQ_ORGAO_ESCOPO (caso ainda nao exista)
SET @col_orgao_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'questionario'
      AND COLUMN_NAME = 'SEQ_ORGAO_ESCOPO'
);

SET @sql_add_col_orgao = IF(@col_orgao_exists = 0,
    'ALTER TABLE questionario ADD COLUMN SEQ_ORGAO_ESCOPO INT UNSIGNED NULL COMMENT ''SEQ do orgao quando escopo = ORGAO''',
    'SELECT ''Coluna SEQ_ORGAO_ESCOPO ja existe'' AS info'
);
PREPARE stmt FROM @sql_add_col_orgao;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- PARTE 6: INDICE (caso ainda nao exista — Prisma schema declara @@index)
SET @idx_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'questionario'
      AND INDEX_NAME = 'idx_questionario_escopo'
);

SET @sql_add_idx = IF(@idx_exists = 0,
    'CREATE INDEX idx_questionario_escopo ON questionario(SEQ_TIPO_ESCOPO_RESPOSTA)',
    'SELECT ''Indice idx_questionario_escopo ja existe'' AS info'
);
PREPARE stmt FROM @sql_add_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
