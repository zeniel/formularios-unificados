-- ============================================================================
-- MIGRAÇÃO V3: Sistema de Versionamento - PUBLICADO = IMUTÁVEL
-- ============================================================================
-- 
-- PRINCÍPIO ÚNICO: Publicou? Imutável. Quer alterar? Nova versão.
--
-- MUDANÇAS:
--   - RASCUNHO = editável
--   - PUBLICADO = imutável (independente de ter respostas)
--   - Sem stored procedures (lógica na aplicação)
--   - Mantém questionario_pergunta para compatibilidade legado
--   - Pergunta tem vínculo direto com questionário (1:N) para novo sistema
--
-- ============================================================================


-- ============================================================================
-- PARTE 1: QUESTIONÁRIO
-- ============================================================================

ALTER TABLE questionario
    -- Versionamento
    ADD COLUMN SEQ_QUESTIONARIO_BASE INT(10) NULL 
        COMMENT 'Raiz do versionamento. NULL = é a versão original.',
    ADD COLUMN NUM_VERSAO INT(10) NOT NULL DEFAULT 1 
        COMMENT 'Número da versão: 1, 2, 3...',
    
    -- Status de publicação (PUBLICADO = IMUTÁVEL)
    ADD COLUMN DSC_STATUS ENUM('RASCUNHO', 'PUBLICADO') NOT NULL DEFAULT 'RASCUNHO'
        COMMENT 'RASCUNHO = editável, PUBLICADO = imutável.',
    ADD COLUMN DAT_PUBLICACAO DATETIME NULL
        COMMENT 'Data/hora da publicação. NULL = rascunho.',
    ADD COLUMN USU_PUBLICACAO VARCHAR(30) NULL
        COMMENT 'Usuário que publicou.',
    
    -- Foreign key para versionamento
    ADD CONSTRAINT fk_questionario_base 
        FOREIGN KEY (SEQ_QUESTIONARIO_BASE) 
        REFERENCES questionario(SEQ_QUESTIONARIO) 
        ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Deprecar FLG_ATIVO
ALTER TABLE questionario 
    MODIFY COLUMN FLG_ATIVO ENUM('S','N') DEFAULT 'S' 
    COMMENT 'DEPRECATED: Usar DSC_STATUS. Mantido para sistema legado.';

-- Índices
CREATE INDEX idx_questionario_base ON questionario(SEQ_QUESTIONARIO_BASE);
CREATE INDEX idx_questionario_status ON questionario(DSC_STATUS);
-- Índice para buscar versões de um questionário
-- (Functional index com COALESCE não é permitido em colunas auto_increment)
-- A aplicação usa: WHERE SEQ_QUESTIONARIO_BASE = ? OR (SEQ_QUESTIONARIO_BASE IS NULL AND SEQ_QUESTIONARIO = ?)
CREATE INDEX idx_questionario_raiz_versao ON questionario(SEQ_QUESTIONARIO_BASE, NUM_VERSAO);


-- ============================================================================
-- PARTE 2: CATEGORIA_PERGUNTA
-- ============================================================================

ALTER TABLE categoria_pergunta
    -- Versionamento
    ADD COLUMN SEQ_CATEGORIA_BASE INT(10) NULL
        COMMENT 'Raiz do versionamento. NULL = é a versão original.',
    ADD COLUMN NUM_VERSAO INT(10) NOT NULL DEFAULT 1
        COMMENT 'Número da versão: 1, 2, 3...',
    
    -- Status de publicação
    ADD COLUMN DSC_STATUS ENUM('RASCUNHO', 'PUBLICADO') NOT NULL DEFAULT 'RASCUNHO'
        COMMENT 'RASCUNHO = editável, PUBLICADO = imutável.',
    ADD COLUMN DAT_PUBLICACAO DATETIME NULL
        COMMENT 'Data/hora da publicação.',
    ADD COLUMN USU_PUBLICACAO VARCHAR(30) NULL
        COMMENT 'Usuário que publicou.',
    
    -- Foreign key
    ADD CONSTRAINT fk_categoria_base 
        FOREIGN KEY (SEQ_CATEGORIA_BASE) 
        REFERENCES categoria_pergunta(SEQ_CATEGORIA_PERGUNTA) 
        ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Índices
CREATE INDEX idx_categoria_base ON categoria_pergunta(SEQ_CATEGORIA_BASE);
CREATE INDEX idx_categoria_status ON categoria_pergunta(DSC_STATUS);


-- ============================================================================
-- PARTE 3: PERGUNTA
-- ============================================================================

ALTER TABLE pergunta
    -- Versionamento
    ADD COLUMN SEQ_PERGUNTA_BASE INT(10) NULL 
        COMMENT 'Raiz do versionamento. NULL = é a versão original.',
    ADD COLUMN NUM_VERSAO INT(10) NOT NULL DEFAULT 1 
        COMMENT 'Número da versão: 1, 2, 3...',
    
    -- Status de publicação
    ADD COLUMN DSC_STATUS ENUM('RASCUNHO', 'PUBLICADO') NOT NULL DEFAULT 'RASCUNHO'
        COMMENT 'RASCUNHO = editável, PUBLICADO = imutável.',
    ADD COLUMN DAT_PUBLICACAO DATETIME NULL
        COMMENT 'Data/hora da publicação.',
    ADD COLUMN USU_PUBLICACAO VARCHAR(30) NULL
        COMMENT 'Usuário que publicou.',
    
    -- Vínculo direto com questionário (novo sistema 1:N)
    ADD COLUMN SEQ_QUESTIONARIO INT(10) NULL
        COMMENT 'Questionário desta pergunta. NULL = usa legado questionario_pergunta.',
    
    -- Ordem dentro do questionário
    ADD COLUMN NUM_ORDEM INT(10) NOT NULL DEFAULT 0
        COMMENT 'Ordem de exibição no questionário.',
    
    -- Foreign keys
    ADD CONSTRAINT fk_pergunta_base 
        FOREIGN KEY (SEQ_PERGUNTA_BASE) 
        REFERENCES pergunta(SEQ_PERGUNTA) 
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    ADD CONSTRAINT fk_pergunta_questionario
        FOREIGN KEY (SEQ_QUESTIONARIO)
        REFERENCES questionario(SEQ_QUESTIONARIO)
        ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Deprecar FLG_ATIVA
ALTER TABLE pergunta 
    MODIFY COLUMN FLG_ATIVA ENUM('S','N') NOT NULL DEFAULT 'S' 
    COMMENT 'DEPRECATED: Usar DSC_STATUS. Mantido para sistema legado.';

-- Índices
CREATE INDEX idx_pergunta_base ON pergunta(SEQ_PERGUNTA_BASE);
CREATE INDEX idx_pergunta_questionario ON pergunta(SEQ_QUESTIONARIO);
CREATE INDEX idx_pergunta_status ON pergunta(DSC_STATUS);
CREATE INDEX idx_pergunta_ordem ON pergunta(SEQ_QUESTIONARIO, NUM_ORDEM);


-- ============================================================================
-- PARTE 4: QUESTIONARIO_PERGUNTA (mantido para legado)
-- ============================================================================

-- Apenas adicionar comentário documentando deprecação
ALTER TABLE questionario_pergunta 
    COMMENT = 'LEGADO: Novo sistema usa pergunta.SEQ_QUESTIONARIO. Mantida para compatibilidade.';


-- ============================================================================
-- PARTE 5: VIEWS AUXILIARES (para consultas simplificadas)
-- ============================================================================

-- View: Questionários com informações consolidadas
CREATE OR REPLACE VIEW vw_questionario_admin AS
SELECT 
    q.SEQ_QUESTIONARIO,
    q.NOM_QUESTIONARIO,
    q.DSC_QUESTIONARIO,
    q.NUM_VERSAO,
    q.SEQ_QUESTIONARIO_BASE,
    COALESCE(q.SEQ_QUESTIONARIO_BASE, q.SEQ_QUESTIONARIO) AS SEQ_QUESTIONARIO_RAIZ,
    q.DSC_STATUS,
    q.DAT_PUBLICACAO,
    q.USU_PUBLICACAO,
    q.DAT_CRIACAO_QUESTIONARIO,
    q.USU_CRIACAO_QUESTIONARIO,
    q.NUM_MES_LIMITE,
    q.NUM_DIA_LIMITE,
    tpp.DSC_TIPO_PERIODICIDADE_PERGUNTA,
    -- Contagens
    (
        SELECT COUNT(*) 
        FROM pergunta p 
        WHERE p.SEQ_QUESTIONARIO = q.SEQ_QUESTIONARIO
    ) AS QTD_PERGUNTAS,
    (
        SELECT COUNT(*) 
        FROM resposta r 
        WHERE r.SEQ_QUESTIONARIO = q.SEQ_QUESTIONARIO
    ) AS QTD_RESPOSTAS
FROM questionario q
LEFT JOIN tipo_periodicidade_pergunta tpp 
    ON tpp.SEQ_TIPO_PERIODICIDADE_PERGUNTA = q.SEQ_TIPO_PERIODICIDADE_PERGUNTA;


-- View: Perguntas com informações consolidadas
CREATE OR REPLACE VIEW vw_pergunta_admin AS
SELECT 
    p.SEQ_PERGUNTA,
    p.DSC_PERGUNTA,
    p.DSC_COMPLEMENTO_PERGUNTA,
    p.TXT_GLOSSARIO,
    p.COD_PERGUNTA,
    p.TXT_JSON_ARRAY_RESPOSTAS,
    p.NUM_VERSAO,
    p.SEQ_PERGUNTA_BASE,
    COALESCE(p.SEQ_PERGUNTA_BASE, p.SEQ_PERGUNTA) AS SEQ_PERGUNTA_RAIZ,
    p.DSC_STATUS,
    p.DAT_PUBLICACAO,
    p.USU_PUBLICACAO,
    p.DAT_CRIACAO_PERGUNTA,
    p.USU_CRIACAO_PERGUNTA,
    p.SEQ_QUESTIONARIO,
    p.NUM_ORDEM,
    -- Questionário
    q.NOM_QUESTIONARIO,
    q.DSC_STATUS AS DSC_STATUS_QUESTIONARIO,
    -- Categoria
    p.SEQ_CATEGORIA_PERGUNTA,
    c.DSC_CATEGORIA_PERGUNTA,
    -- Tipo de resposta
    p.SEQ_TIPO_FORMATO_RESPOSTA,
    tfr.DSC_TIPO_FORMATO_RESPOSTA,
    tfr.COD_TIPO_FORMATO_RESPOSTA,
    -- Periodicidade
    p.SEQ_TIPO_PERIODICIDADE_PERGUNTA,
    tpp.DSC_TIPO_PERIODICIDADE_PERGUNTA,
    -- Contagem de respostas
    (
        SELECT COUNT(*) 
        FROM resposta r 
        WHERE r.SEQ_PERGUNTA = p.SEQ_PERGUNTA
    ) AS QTD_RESPOSTAS
FROM pergunta p
LEFT JOIN questionario q ON q.SEQ_QUESTIONARIO = p.SEQ_QUESTIONARIO
LEFT JOIN categoria_pergunta c ON c.SEQ_CATEGORIA_PERGUNTA = p.SEQ_CATEGORIA_PERGUNTA
LEFT JOIN tipo_formato_resposta tfr ON tfr.SEQ_TIPO_FORMATO_RESPOSTA = p.SEQ_TIPO_FORMATO_RESPOSTA
LEFT JOIN tipo_periodicidade_pergunta tpp ON tpp.SEQ_TIPO_PERIODICIDADE_PERGUNTA = p.SEQ_TIPO_PERIODICIDADE_PERGUNTA;


-- View: Categorias com informações consolidadas
CREATE OR REPLACE VIEW vw_categoria_admin AS
SELECT 
    c.SEQ_CATEGORIA_PERGUNTA,
    c.DSC_CATEGORIA_PERGUNTA,
    c.NUM_ORDEM,
    c.NUM_VERSAO,
    COALESCE(c.SEQ_CATEGORIA_BASE, c.SEQ_CATEGORIA_PERGUNTA) AS SEQ_CATEGORIA_RAIZ,
    c.DSC_STATUS,
    c.DAT_PUBLICACAO,
    c.USU_PUBLICACAO,
    c.DAT_INCLUSAO,
    c.USU_INCLUSAO,
    -- Categoria pai
    c.SEQ_CATEGORIA_PERGUNTA_PAI,
    cp.DSC_CATEGORIA_PERGUNTA AS DSC_CATEGORIA_PAI,
    -- Contagem de perguntas
    (
        SELECT COUNT(*) 
        FROM pergunta p 
        WHERE p.SEQ_CATEGORIA_PERGUNTA = c.SEQ_CATEGORIA_PERGUNTA
    ) AS QTD_PERGUNTAS,
    -- Contagem de subcategorias
    (
        SELECT COUNT(*) 
        FROM categoria_pergunta sub 
        WHERE sub.SEQ_CATEGORIA_PERGUNTA_PAI = c.SEQ_CATEGORIA_PERGUNTA
    ) AS QTD_SUBCATEGORIAS
FROM categoria_pergunta c
LEFT JOIN categoria_pergunta cp ON cp.SEQ_CATEGORIA_PERGUNTA = c.SEQ_CATEGORIA_PERGUNTA_PAI;


-- View: Histórico de versões de um questionário
CREATE OR REPLACE VIEW vw_questionario_versoes AS
SELECT 
    COALESCE(q.SEQ_QUESTIONARIO_BASE, q.SEQ_QUESTIONARIO) AS SEQ_QUESTIONARIO_RAIZ,
    q.SEQ_QUESTIONARIO,
    q.NOM_QUESTIONARIO,
    q.NUM_VERSAO,
    q.DSC_STATUS,
    q.DAT_PUBLICACAO,
    q.DAT_CRIACAO_QUESTIONARIO,
    (SELECT COUNT(*) FROM pergunta p WHERE p.SEQ_QUESTIONARIO = q.SEQ_QUESTIONARIO) AS QTD_PERGUNTAS,
    (SELECT COUNT(*) FROM resposta r WHERE r.SEQ_QUESTIONARIO = q.SEQ_QUESTIONARIO) AS QTD_RESPOSTAS
FROM questionario q
ORDER BY 
    COALESCE(q.SEQ_QUESTIONARIO_BASE, q.SEQ_QUESTIONARIO),
    q.NUM_VERSAO DESC;


-- View: Histórico de versões de uma pergunta
CREATE OR REPLACE VIEW vw_pergunta_versoes AS
SELECT 
    COALESCE(p.SEQ_PERGUNTA_BASE, p.SEQ_PERGUNTA) AS SEQ_PERGUNTA_RAIZ,
    p.SEQ_PERGUNTA,
    LEFT(p.DSC_PERGUNTA, 100) AS DSC_PERGUNTA_RESUMO,
    p.NUM_VERSAO,
    p.DSC_STATUS,
    p.DAT_PUBLICACAO,
    p.DAT_CRIACAO_PERGUNTA,
    p.SEQ_QUESTIONARIO,
    (SELECT COUNT(*) FROM resposta r WHERE r.SEQ_PERGUNTA = p.SEQ_PERGUNTA) AS QTD_RESPOSTAS
FROM pergunta p
ORDER BY 
    COALESCE(p.SEQ_PERGUNTA_BASE, p.SEQ_PERGUNTA),
    p.NUM_VERSAO DESC;


-- ============================================================================
-- PARTE 6: ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ============================================================================

-- Para buscar última versão publicada
CREATE INDEX idx_questionario_raiz_status ON questionario(
    DSC_STATUS,
    SEQ_QUESTIONARIO_BASE
);

CREATE INDEX idx_pergunta_raiz_status ON pergunta(
    DSC_STATUS,
    SEQ_PERGUNTA_BASE
);

-- Para ordenar perguntas no questionário
CREATE INDEX idx_pergunta_quest_ordem ON pergunta(
    SEQ_QUESTIONARIO,
    NUM_ORDEM,
    SEQ_PERGUNTA
);
