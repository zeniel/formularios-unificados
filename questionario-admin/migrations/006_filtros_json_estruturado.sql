-- ============================================================================
-- MIGRACAO: Filtros JSON Estruturado + FK para Expression Language
-- ============================================================================
-- Substitui TXT_FILTRO_VISIBILIDADE por JSON_FILTRO_VISIBILIDADE
-- Adiciona FK entre pergunta e expression_language
-- ============================================================================

-- PARTE 1: TABELA EXPRESSION_LANGUAGE (catalogo de ELs disponiveis)
CREATE TABLE IF NOT EXISTS expression_language (
    COD_EXPRESSION_LANGUAGE VARCHAR(50) NOT NULL
        COMMENT 'Codigo unico. Ex: EL_ESFERA_TRIBUNAL',
    DSC_EXPRESSION_LANGUAGE VARCHAR(200) NOT NULL
        COMMENT 'Descricao para UI',
    DSC_TIPO_RETORNO ENUM('STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'LISTA') NOT NULL
        COMMENT 'Tipo do valor retornado',
    JSON_VALORES_POSSIVEIS JSON NULL
        COMMENT 'Array de valores possiveis para validacao/autocomplete',
    COD_FONTE_DADOS VARCHAR(50) NOT NULL
        COMMENT 'De onde vem: SESSAO, CORPORATIVO_API, CALCULADO, QUESTIONARIO',
    FLG_ATIVO ENUM('S', 'N') NOT NULL DEFAULT 'S',
    DAT_CRIACAO DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (COD_EXPRESSION_LANGUAGE)
) ENGINE=InnoDB DEFAULT CHARSET=latin1
COMMENT='Catalogo de Expression Languages disponiveis para perguntas ocultas';

-- ELs padrao
INSERT INTO expression_language (COD_EXPRESSION_LANGUAGE, DSC_EXPRESSION_LANGUAGE, DSC_TIPO_RETORNO, JSON_VALORES_POSSIVEIS, COD_FONTE_DADOS) VALUES
-- Tribunal
('EL_ESFERA', 'Esfera do Tribunal', 'STRING', 
 '["ESTADUAL", "FEDERAL", "TRABALHO", "ELEITORAL", "MILITAR", "SUPERIOR"]', 
 'CORPORATIVO_API'),
('EL_UF', 'UF do Tribunal', 'STRING',
 '["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]',
 'CORPORATIVO_API'),
('EL_SIGLA_TRIBUNAL', 'Sigla do Tribunal', 'STRING', NULL, 'CORPORATIVO_API'),
('EL_NOME_TRIBUNAL', 'Nome do Tribunal', 'STRING', NULL, 'CORPORATIVO_API'),
-- Usuario
('EL_PERFIL', 'Perfil Corporativo', 'STRING', NULL, 'SESSAO'),
-- Calculados
('EL_ANO_ATUAL', 'Ano Atual', 'INTEGER', NULL, 'CALCULADO'),
('EL_MES_ATUAL', 'Mes Atual', 'INTEGER', NULL, 'CALCULADO'),
('EL_DATA_ATUAL', 'Data Atual', 'DATE', NULL, 'CALCULADO'),
-- Questionario
('EL_ANO_REFERENCIA', 'Ano de Referencia', 'INTEGER', NULL, 'QUESTIONARIO'),
('EL_MES_REFERENCIA', 'Mes de Referencia', 'INTEGER', NULL, 'QUESTIONARIO');


-- PARTE 2: ALTERAR TABELA PERGUNTA
ALTER TABLE pergunta
    -- Pergunta oculta (preenchida automaticamente)
    ADD COLUMN FLG_OCULTA ENUM('S', 'N') NOT NULL DEFAULT 'N'
        COMMENT 'S = pergunta oculta, preenchida automaticamente via EL',
    
    -- FK para expression_language
    ADD COLUMN COD_EXPRESSION_LANGUAGE VARCHAR(50) NULL
        COMMENT 'Codigo da EL que preenche esta pergunta oculta',
    
    -- Filtro em JSON estruturado (substitui TXT)
    ADD COLUMN JSON_FILTRO_VISIBILIDADE JSON NULL
        COMMENT 'Condicoes para exibir pergunta. Formato JSON estruturado.',
    
    -- FK
    ADD CONSTRAINT fk_pergunta_expression_language
        FOREIGN KEY (COD_EXPRESSION_LANGUAGE)
        REFERENCES expression_language(COD_EXPRESSION_LANGUAGE)
        ON DELETE SET NULL ON UPDATE CASCADE;

-- Indices
CREATE INDEX idx_pergunta_oculta ON pergunta(FLG_OCULTA);
CREATE INDEX idx_pergunta_el ON pergunta(COD_EXPRESSION_LANGUAGE);
CREATE INDEX idx_pergunta_codigo_quest ON pergunta(SEQ_QUESTIONARIO, COD_PERGUNTA);


-- PARTE 3: TABELA DE OPERADORES (para UI e validacao)
CREATE TABLE IF NOT EXISTS operador_filtro (
    COD_OPERADOR VARCHAR(20) NOT NULL,
    DSC_OPERADOR VARCHAR(50) NOT NULL COMMENT 'Para exibicao na UI',
    DSC_SIMBOLO VARCHAR(10) NULL COMMENT 'Simbolo: =, !=, >, etc',
    JSON_TIPOS_COMPATIVEIS JSON NOT NULL COMMENT 'Tipos de campo compativeis',
    FLG_REQUER_VALOR ENUM('S', 'N') NOT NULL DEFAULT 'S',
    FLG_REQUER_LISTA ENUM('S', 'N') NOT NULL DEFAULT 'N',
    PRIMARY KEY (COD_OPERADOR)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

INSERT INTO operador_filtro (COD_OPERADOR, DSC_OPERADOR, DSC_SIMBOLO, JSON_TIPOS_COMPATIVEIS, FLG_REQUER_VALOR, FLG_REQUER_LISTA) VALUES
('IGUAL', 'Igual a', '=', '["STRING", "INTEGER", "DECIMAL", "DATE", "BOOLEAN"]', 'S', 'N'),
('DIFERENTE', 'Diferente de', '!=', '["STRING", "INTEGER", "DECIMAL", "DATE", "BOOLEAN"]', 'S', 'N'),
('MAIOR', 'Maior que', '>', '["INTEGER", "DECIMAL", "DATE"]', 'S', 'N'),
('MENOR', 'Menor que', '<', '["INTEGER", "DECIMAL", "DATE"]', 'S', 'N'),
('MAIOR_IGUAL', 'Maior ou igual', '>=', '["INTEGER", "DECIMAL", "DATE"]', 'S', 'N'),
('MENOR_IGUAL', 'Menor ou igual', '<=', '["INTEGER", "DECIMAL", "DATE"]', 'S', 'N'),
('EM', 'Esta na lista', 'IN', '["STRING", "INTEGER"]', 'N', 'S'),
('NAO_EM', 'Nao esta na lista', 'NOT IN', '["STRING", "INTEGER"]', 'N', 'S'),
('CONTEM', 'Contem', 'LIKE', '["STRING"]', 'S', 'N'),
('COMECA_COM', 'Comeca com', 'STARTS', '["STRING"]', 'S', 'N'),
('TERMINA_COM', 'Termina com', 'ENDS', '["STRING"]', 'S', 'N'),
('VAZIO', 'Esta vazio', 'IS NULL', '["STRING", "INTEGER", "DECIMAL", "DATE"]', 'N', 'N'),
('NAO_VAZIO', 'Esta preenchido', 'IS NOT NULL', '["STRING", "INTEGER", "DECIMAL", "DATE"]', 'N', 'N');
