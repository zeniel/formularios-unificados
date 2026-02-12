update questionario q 
set q.SEQ_TIPO_ESCOPO_RESPOSTA = (select SEQ_TIPO_ESCOPO_RESPOSTA from tipo_escopo_resposta where COD_TIPO_ESCOPO = 'TRIBUNAL')
WHERE SEQ_TIPO_ESCOPO_RESPOSTA is null;