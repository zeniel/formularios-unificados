-- ============================================================
-- MIGRATION: 007_elementos_questionario.sql
-- Sistema de elementos para layout de questionários
-- Autor: Zeniel / Claude
-- Data: 2026-02-12
-- ============================================================

-- ============================================================
-- 1. TABELA CENTRAL: ELEMENTO_QUESTIONARIO
-- ============================================================

CREATE TABLE elemento_questionario (
    SEQ_ELEMENTO            INT AUTO_INCREMENT PRIMARY KEY,
    SEQ_QUESTIONARIO        INT NOT NULL,
    SEQ_VERSAO              INT NOT NULL,
    COD_TIPO_ELEMENTO       ENUM('SECAO', 'PERGUNTA', 'TEXTO', 'MIDIA', 'SEPARADOR') NOT NULL,
    NUM_ORDEM               INT NOT NULL,
    SEQ_SECAO               INT NULL COMMENT 'FK para secao_questionario - indica que este elemento pertence a uma seção',
    JSON_FILTRO_VISIBILIDADE JSON NULL COMMENT 'Filtro de visibilidade condicional',
    FLG_ATIVO               CHAR(1) DEFAULT 'S',
    DAT_CRIACAO             DATETIME DEFAULT NOW(),
    DAT_ATUALIZACAO         DATETIME DEFAULT NOW() ON UPDATE NOW(),
    
    INDEX idx_elemento_questionario_versao (SEQ_QUESTIONARIO, SEQ_VERSAO, NUM_ORDEM),
    INDEX idx_elemento_secao (SEQ_SECAO),
    INDEX idx_elemento_tipo (COD_TIPO_ELEMENTO)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabela central de elementos do questionário (seções, perguntas, textos, mídias, separadores)';


-- ============================================================
-- 2. DETALHES: SECAO_QUESTIONARIO
-- ============================================================

CREATE TABLE secao_questionario (
    SEQ_SECAO               INT AUTO_INCREMENT PRIMARY KEY,
    SEQ_ELEMENTO            INT NOT NULL UNIQUE COMMENT 'FK 1:1 para elemento_questionario',
    DSC_TITULO              VARCHAR(500) NULL COMMENT 'Título da seção (pode ser null para seção sem cabeçalho)',
    DSC_DESCRICAO           TEXT NULL COMMENT 'Descrição/subtítulo da seção',
    NUM_COLUNAS             TINYINT NOT NULL DEFAULT 1 COMMENT 'Número de colunas do grid (1 ou 2)',
    FLG_COLAPSAVEL          CHAR(1) NOT NULL DEFAULT 'N' COMMENT 'S = seção pode ser expandida/recolhida (accordion)',
    
    CONSTRAINT chk_secao_colunas CHECK (NUM_COLUNAS IN (1, 2)),
    CONSTRAINT chk_secao_colapsavel CHECK (FLG_COLAPSAVEL IN ('S', 'N'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Detalhes específicos de elementos do tipo SECAO';


-- ============================================================
-- 3. DETALHES: TEXTO_QUESTIONARIO
-- ============================================================

CREATE TABLE texto_questionario (
    SEQ_TEXTO               INT AUTO_INCREMENT PRIMARY KEY,
    SEQ_ELEMENTO            INT NOT NULL UNIQUE COMMENT 'FK 1:1 para elemento_questionario',
    COD_TIPO_TEXTO          ENUM('PARAGRAFO', 'TITULO', 'SUBTITULO', 'CALLOUT', 'INSTRUCAO') NOT NULL,
    DSC_CONTEUDO            TEXT NOT NULL COMMENT 'Conteúdo textual (pode conter HTML básico)',
    COD_ESTILO              ENUM('DEFAULT', 'INFO', 'WARNING', 'DANGER', 'SUCCESS') DEFAULT 'DEFAULT' COMMENT 'Estilo visual do texto (principalmente para CALLOUT)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Detalhes específicos de elementos do tipo TEXTO';


-- ============================================================
-- 4. DETALHES: MIDIA_QUESTIONARIO
-- ============================================================

CREATE TABLE midia_questionario (
    SEQ_MIDIA               INT AUTO_INCREMENT PRIMARY KEY,
    SEQ_ELEMENTO            INT NOT NULL UNIQUE COMMENT 'FK 1:1 para elemento_questionario',
    COD_TIPO_MIDIA          ENUM('IMAGEM', 'VIDEO', 'ARQUIVO', 'EMBED') NOT NULL,
    DSC_URL                 VARCHAR(1000) NOT NULL COMMENT 'URL do recurso',
    DSC_LEGENDA             VARCHAR(500) NULL COMMENT 'Legenda exibida abaixo da mídia',
    DSC_ALT_TEXT            VARCHAR(500) NULL COMMENT 'Texto alternativo para acessibilidade'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Detalhes específicos de elementos do tipo MIDIA';


-- ============================================================
-- 5. DETALHES: SEPARADOR_QUESTIONARIO
-- ============================================================

CREATE TABLE separador_questionario (
    SEQ_SEPARADOR           INT AUTO_INCREMENT PRIMARY KEY,
    SEQ_ELEMENTO            INT NOT NULL UNIQUE COMMENT 'FK 1:1 para elemento_questionario',
    FLG_QUEBRA_PAGINA       CHAR(1) NOT NULL DEFAULT 'N' COMMENT 'S = quebra de página (nova tela no wizard), N = linha divisória visual',
    
    CONSTRAINT chk_separador_quebra CHECK (FLG_QUEBRA_PAGINA IN ('S', 'N'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Detalhes específicos de elementos do tipo SEPARADOR';


-- ============================================================
-- 6. ALTERAÇÃO: ADICIONAR SEQ_ELEMENTO NA TABELA PERGUNTA
-- ============================================================

ALTER TABLE pergunta 
ADD COLUMN SEQ_ELEMENTO INT NULL UNIQUE COMMENT 'FK para elemento_questionario - posiciona a pergunta no formulário'
AFTER SEQ_VERSAO;


-- ============================================================
-- 7. FOREIGN KEYS
-- ============================================================

-- elemento → questionario_versao
ALTER TABLE elemento_questionario
ADD CONSTRAINT fk_elemento_questionario_versao
FOREIGN KEY (SEQ_QUESTIONARIO, SEQ_VERSAO) 
REFERENCES questionario_versao(SEQ_QUESTIONARIO, SEQ_VERSAO)
ON DELETE CASCADE;

-- elemento.SEQ_SECAO → secao_questionario (relacionamento "pertence a")
-- Nota: FK adicionada após criar secao_questionario
ALTER TABLE elemento_questionario
ADD CONSTRAINT fk_elemento_secao
FOREIGN KEY (SEQ_SECAO) 
REFERENCES secao_questionario(SEQ_SECAO)
ON DELETE SET NULL;

-- secao → elemento (1:1)
ALTER TABLE secao_questionario
ADD CONSTRAINT fk_secao_elemento
FOREIGN KEY (SEQ_ELEMENTO) 
REFERENCES elemento_questionario(SEQ_ELEMENTO)
ON DELETE CASCADE;

-- texto → elemento (1:1)
ALTER TABLE texto_questionario
ADD CONSTRAINT fk_texto_elemento
FOREIGN KEY (SEQ_ELEMENTO) 
REFERENCES elemento_questionario(SEQ_ELEMENTO)
ON DELETE CASCADE;

-- midia → elemento (1:1)
ALTER TABLE midia_questionario
ADD CONSTRAINT fk_midia_elemento
FOREIGN KEY (SEQ_ELEMENTO) 
REFERENCES elemento_questionario(SEQ_ELEMENTO)
ON DELETE CASCADE;

-- separador → elemento (1:1)
ALTER TABLE separador_questionario
ADD CONSTRAINT fk_separador_elemento
FOREIGN KEY (SEQ_ELEMENTO) 
REFERENCES elemento_questionario(SEQ_ELEMENTO)
ON DELETE CASCADE;

-- pergunta → elemento (1:1)
ALTER TABLE pergunta
ADD CONSTRAINT fk_pergunta_elemento
FOREIGN KEY (SEQ_ELEMENTO) 
REFERENCES elemento_questionario(SEQ_ELEMENTO)
ON DELETE SET NULL;


-- ============================================================
-- 8. CONSTRAINTS DE NEGÓCIO
-- ============================================================

-- Seções são sempre elementos raiz (não podem pertencer a outras seções)
-- Isso garante apenas 1 nível de aninhamento
ALTER TABLE elemento_questionario
ADD CONSTRAINT chk_secao_raiz CHECK (
    COD_TIPO_ELEMENTO != 'SECAO' OR SEQ_SECAO IS NULL
);


-- ============================================================
-- 9. VIEWS ÚTEIS
-- ============================================================

-- View: Elementos com detalhes (facilita consultas)
CREATE OR REPLACE VIEW vw_elemento_completo AS
SELECT 
    e.SEQ_ELEMENTO,
    e.SEQ_QUESTIONARIO,
    e.SEQ_VERSAO,
    e.COD_TIPO_ELEMENTO,
    e.NUM_ORDEM,
    e.SEQ_SECAO,
    e.JSON_FILTRO_VISIBILIDADE,
    e.FLG_ATIVO,
    
    -- Dados da SECAO
    s.SEQ_SECAO AS secao_seq,
    s.DSC_TITULO AS secao_titulo,
    s.DSC_DESCRICAO AS secao_descricao,
    s.NUM_COLUNAS AS secao_colunas,
    s.FLG_COLAPSAVEL AS secao_colapsavel,
    
    -- Dados do TEXTO
    t.SEQ_TEXTO AS texto_seq,
    t.COD_TIPO_TEXTO AS texto_tipo,
    t.DSC_CONTEUDO AS texto_conteudo,
    t.COD_ESTILO AS texto_estilo,
    
    -- Dados da MIDIA
    m.SEQ_MIDIA AS midia_seq,
    m.COD_TIPO_MIDIA AS midia_tipo,
    m.DSC_URL AS midia_url,
    m.DSC_LEGENDA AS midia_legenda,
    m.DSC_ALT_TEXT AS midia_alt_text,
    
    -- Dados do SEPARADOR
    sp.SEQ_SEPARADOR AS separador_seq,
    sp.FLG_QUEBRA_PAGINA AS separador_quebra_pagina,
    
    -- Dados da PERGUNTA
    p.SEQ_PERGUNTA AS pergunta_seq,
    p.DSC_PERGUNTA AS pergunta_texto,
    p.COD_TIPO_RESPOSTA AS pergunta_tipo_resposta,
    p.FLG_OBRIGATORIA AS pergunta_obrigatoria
    
FROM elemento_questionario e
LEFT JOIN secao_questionario s ON s.SEQ_ELEMENTO = e.SEQ_ELEMENTO
LEFT JOIN texto_questionario t ON t.SEQ_ELEMENTO = e.SEQ_ELEMENTO
LEFT JOIN midia_questionario m ON m.SEQ_ELEMENTO = e.SEQ_ELEMENTO
LEFT JOIN separador_questionario sp ON sp.SEQ_ELEMENTO = e.SEQ_ELEMENTO
LEFT JOIN pergunta p ON p.SEQ_ELEMENTO = e.SEQ_ELEMENTO;


-- View: Estrutura do questionário (elementos raiz e contagem de filhos)
CREATE OR REPLACE VIEW vw_estrutura_questionario AS
SELECT 
    q.SEQ_QUESTIONARIO,
    q.SEQ_VERSAO,
    qv.DSC_TITULO AS questionario_titulo,
    COUNT(DISTINCT CASE WHEN e.COD_TIPO_ELEMENTO = 'SECAO' THEN e.SEQ_ELEMENTO END) AS qtd_secoes,
    COUNT(DISTINCT CASE WHEN e.COD_TIPO_ELEMENTO = 'PERGUNTA' THEN e.SEQ_ELEMENTO END) AS qtd_perguntas,
    COUNT(DISTINCT CASE WHEN e.COD_TIPO_ELEMENTO = 'TEXTO' THEN e.SEQ_ELEMENTO END) AS qtd_textos,
    COUNT(DISTINCT CASE WHEN e.COD_TIPO_ELEMENTO = 'MIDIA' THEN e.SEQ_ELEMENTO END) AS qtd_midias,
    COUNT(DISTINCT CASE WHEN e.COD_TIPO_ELEMENTO = 'SEPARADOR' AND sp.FLG_QUEBRA_PAGINA = 'S' THEN e.SEQ_ELEMENTO END) AS qtd_paginas
FROM questionario q
JOIN questionario_versao qv ON qv.SEQ_QUESTIONARIO = q.SEQ_QUESTIONARIO
LEFT JOIN elemento_questionario e ON e.SEQ_QUESTIONARIO = q.SEQ_QUESTIONARIO AND e.SEQ_VERSAO = qv.SEQ_VERSAO
LEFT JOIN separador_questionario sp ON sp.SEQ_ELEMENTO = e.SEQ_ELEMENTO
WHERE e.FLG_ATIVO = 'S'
GROUP BY q.SEQ_QUESTIONARIO, q.SEQ_VERSAO, qv.DSC_TITULO;


-- ============================================================
-- 10. PROCEDURES DE APOIO
-- ============================================================

DELIMITER //

-- Procedure: Criar elemento (retorna SEQ_ELEMENTO criado)
CREATE PROCEDURE sp_criar_elemento(
    IN p_seq_questionario INT,
    IN p_seq_versao INT,
    IN p_tipo_elemento VARCHAR(20),
    IN p_seq_secao INT,
    IN p_filtro_visibilidade JSON,
    OUT p_seq_elemento INT
)
BEGIN
    DECLARE v_max_ordem INT;
    
    -- Obter próxima ordem
    SELECT COALESCE(MAX(NUM_ORDEM), 0) + 1 INTO v_max_ordem
    FROM elemento_questionario
    WHERE SEQ_QUESTIONARIO = p_seq_questionario AND SEQ_VERSAO = p_seq_versao;
    
    -- Inserir elemento
    INSERT INTO elemento_questionario (
        SEQ_QUESTIONARIO, 
        SEQ_VERSAO, 
        COD_TIPO_ELEMENTO, 
        NUM_ORDEM, 
        SEQ_SECAO,
        JSON_FILTRO_VISIBILIDADE
    ) VALUES (
        p_seq_questionario,
        p_seq_versao,
        p_tipo_elemento,
        v_max_ordem,
        p_seq_secao,
        p_filtro_visibilidade
    );
    
    SET p_seq_elemento = LAST_INSERT_ID();
END //


-- Procedure: Criar seção completa (elemento + detalhes)
CREATE PROCEDURE sp_criar_secao(
    IN p_seq_questionario INT,
    IN p_seq_versao INT,
    IN p_titulo VARCHAR(500),
    IN p_descricao TEXT,
    IN p_colunas TINYINT,
    IN p_colapsavel CHAR(1),
    IN p_filtro JSON,
    OUT p_seq_secao INT
)
BEGIN
    DECLARE v_seq_elemento INT;
    
    -- Criar elemento
    CALL sp_criar_elemento(
        p_seq_questionario, 
        p_seq_versao, 
        'SECAO', 
        NULL,  -- Seções são sempre raiz
        p_filtro, 
        v_seq_elemento
    );
    
    -- Criar detalhes da seção
    INSERT INTO secao_questionario (
        SEQ_ELEMENTO, 
        DSC_TITULO, 
        DSC_DESCRICAO, 
        NUM_COLUNAS, 
        FLG_COLAPSAVEL
    ) VALUES (
        v_seq_elemento,
        p_titulo,
        p_descricao,
        COALESCE(p_colunas, 1),
        COALESCE(p_colapsavel, 'N')
    );
    
    SET p_seq_secao = LAST_INSERT_ID();
END //


-- Procedure: Criar separador (com ou sem quebra de página)
CREATE PROCEDURE sp_criar_separador(
    IN p_seq_questionario INT,
    IN p_seq_versao INT,
    IN p_seq_secao INT,
    IN p_quebra_pagina CHAR(1),
    OUT p_seq_separador INT
)
BEGIN
    DECLARE v_seq_elemento INT;
    
    CALL sp_criar_elemento(
        p_seq_questionario, 
        p_seq_versao, 
        'SEPARADOR', 
        p_seq_secao,
        NULL, 
        v_seq_elemento
    );
    
    INSERT INTO separador_questionario (SEQ_ELEMENTO, FLG_QUEBRA_PAGINA)
    VALUES (v_seq_elemento, COALESCE(p_quebra_pagina, 'N'));
    
    SET p_seq_separador = LAST_INSERT_ID();
END //


DELIMITER ;


-- ============================================================
-- 11. DADOS DE EXEMPLO (opcional - comentar em produção)
-- ============================================================

/*
-- Exemplo: Criar questionário com seções e elementos

-- Supondo que existe questionario com SEQ_QUESTIONARIO=1, SEQ_VERSAO=1

-- Criar seção "Identificação" (2 colunas)
CALL sp_criar_secao(1, 1, 'Identificação do Tribunal', 'Preencha os dados básicos', 2, 'N', NULL, @secao1);

-- Criar seção "Estrutura" (1 coluna)
CALL sp_criar_secao(1, 1, 'Estrutura de Pessoal', NULL, 1, 'N', NULL, @secao2);

-- Criar separador de página entre seções
CALL sp_criar_separador(1, 1, NULL, 'S', @sep1);

-- Verificar estrutura criada
SELECT * FROM vw_elemento_completo WHERE SEQ_QUESTIONARIO = 1 ORDER BY NUM_ORDEM;
*/
