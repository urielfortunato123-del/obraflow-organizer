// Sistema de aliases para classificação automática de fotos
// Mapeia termos encontrados em pastas/arquivos/OCR para disciplina/serviço

export type AliasRule = {
  match: string[];            // palavras/padrões (UPPER, sem acento)
  disciplina?: string;        // enum oficial
  servico?: string;           // enum oficial
  frente?: string;            // frente de obra (opcional)
  prioridade?: number;        // quanto maior, mais forte (0-100)
};

export const ALIAS_RULES: AliasRule[] = [
  // =========================================
  // FRENTES DE OBRA (prioridade alta)
  // =========================================
  { match: ["FREE", "FLOW", "P01"], frente: "FREE_FLOW_P01", prioridade: 100 },
  { match: ["FREE", "FLOW", "P02"], frente: "FREE_FLOW_P02", prioridade: 100 },
  { match: ["FREE", "FLOW", "P03"], frente: "FREE_FLOW_P03", prioridade: 100 },
  { match: ["FREE", "FLOW", "P04"], frente: "FREE_FLOW_P04", prioridade: 100 },
  { match: ["FREE", "FLOW", "P05"], frente: "FREE_FLOW_P05", prioridade: 100 },
  { match: ["FREE", "FLOW", "P06"], frente: "FREE_FLOW_P06", prioridade: 100 },
  { match: ["FREE", "FLOW", "P07"], frente: "FREE_FLOW_P07", prioridade: 100 },
  { match: ["FREE", "FLOW", "P08"], frente: "FREE_FLOW_P08", prioridade: 100 },
  { match: ["FREE", "FLOW", "P09"], frente: "FREE_FLOW_P09", prioridade: 100 },
  { match: ["FREE", "FLOW", "P10"], frente: "FREE_FLOW_P10", prioridade: 100 },
  { match: ["FREE", "FLOW", "P11"], frente: "FREE_FLOW_P11", prioridade: 100 },
  { match: ["FREE", "FLOW", "P12"], frente: "FREE_FLOW_P12", prioridade: 100 },
  { match: ["FREE", "FLOW", "P13"], frente: "FREE_FLOW_P13", prioridade: 100 },
  { match: ["FREE", "FLOW", "P14"], frente: "FREE_FLOW_P14", prioridade: 100 },
  { match: ["FREE", "FLOW", "P15"], frente: "FREE_FLOW_P15", prioridade: 100 },
  { match: ["BSO", "01"], frente: "BSO_01", prioridade: 100 },
  { match: ["BSO", "02"], frente: "BSO_02", prioridade: 100 },
  { match: ["BSO", "03"], frente: "BSO_03", prioridade: 100 },
  { match: ["BSO", "04"], frente: "BSO_04", prioridade: 100 },
  { match: ["BSO", "05"], frente: "BSO_05", prioridade: 100 },
  { match: ["BSO", "NORTE"], frente: "BSO_NORTE", prioridade: 100 },
  { match: ["BSO", "SUL"], frente: "BSO_SUL", prioridade: 100 },
  { match: ["PRACA", "PEDAGIO"], frente: "PRACA_PEDAGIO_CENTRAL", prioridade: 90 },
  { match: ["CANTEIRO", "OBRAS"], frente: "CANTEIRO_OBRAS", prioridade: 90 },
  { match: ["LOTE", "A"], frente: "LOTE_A", prioridade: 95 },
  { match: ["LOTE", "B"], frente: "LOTE_B", prioridade: 95 },
  { match: ["LOTE", "C"], frente: "LOTE_C", prioridade: 95 },
  { match: ["LOTE", "01"], frente: "LOTE_01", prioridade: 95 },
  { match: ["LOTE", "02"], frente: "LOTE_02", prioridade: 95 },

  // =========================================
  // DRENAGEM / VALETA / SARJETA
  // =========================================
  {
    match: ["LIMPEZA", "CONFORMAC", "VALETA"],
    disciplina: "DRENAGEM",
    servico: "LIMPEZA_DE_DRENAGEM",
    prioridade: 90,
  },
  {
    match: ["ESCAVAC", "CONFORMAC", "VALETA"],
    disciplina: "DRENAGEM",
    servico: "ESCAVACAO_DE_VALAS",
    prioridade: 95,
  },
  {
    match: ["ESCAVAC", "VALETA"],
    disciplina: "DRENAGEM",
    servico: "ESCAVACAO_DE_VALAS",
    prioridade: 90,
  },
  {
    match: ["VALETA", "PROTEC"],
    disciplina: "DRENAGEM",
    servico: "VALETA_PROTECAO",
    prioridade: 85,
  },
  {
    match: ["VALETA"],
    disciplina: "DRENAGEM",
    servico: "VALETA_PROTECAO",
    prioridade: 60,
  },
  {
    match: ["SARJETA", "CONCRETO"],
    disciplina: "DRENAGEM",
    servico: "SARJETA_CONCRETO",
    prioridade: 90,
  },
  {
    match: ["SARJETA"],
    disciplina: "DRENAGEM",
    servico: "SARJETA_CONCRETO",
    prioridade: 80,
  },
  {
    match: ["SARJETAO"],
    disciplina: "DRENAGEM",
    servico: "SARJETAO",
    prioridade: 85,
  },
  {
    match: ["MEIO", "FIO"],
    disciplina: "DRENAGEM",
    servico: "MEIO_FIO_CONCRETO",
    prioridade: 80,
  },
  {
    match: ["CANALETA"],
    disciplina: "DRENAGEM",
    servico: "CANALETA_CONCRETO",
    prioridade: 80,
  },
  {
    match: ["BOCA", "LOBO"],
    disciplina: "DRENAGEM",
    servico: "BOCA_LOBO",
    prioridade: 85,
  },
  {
    match: ["POCO", "VISITA"],
    disciplina: "DRENAGEM",
    servico: "POCO_VISITA",
    prioridade: 85,
  },
  {
    match: ["DESCIDA", "AGUA"],
    disciplina: "DRENAGEM",
    servico: "DESCIDA_AGUA",
    prioridade: 80,
  },
  {
    match: ["BUEIRO", "TUBULAR"],
    disciplina: "DRENAGEM",
    servico: "BUEIRO_TUBULAR",
    prioridade: 90,
  },
  {
    match: ["BUEIRO", "CELULAR"],
    disciplina: "DRENAGEM",
    servico: "BUEIRO_CELULAR",
    prioridade: 90,
  },
  {
    match: ["BUEIRO"],
    disciplina: "DRENAGEM",
    servico: "BUEIRO_TUBULAR",
    prioridade: 75,
  },
  {
    match: ["DRENO", "LONGITUDINAL"],
    disciplina: "DRENAGEM",
    servico: "DRENO_LONGITUDINAL",
    prioridade: 90,
  },
  {
    match: ["DRENO", "TRANSVERSAL"],
    disciplina: "DRENAGEM",
    servico: "DRENO_TRANSVERSAL",
    prioridade: 90,
  },
  {
    match: ["DRENO", "PROFUNDO"],
    disciplina: "DRENAGEM",
    servico: "DRENO_PROFUNDO",
    prioridade: 85,
  },
  {
    match: ["DRENO", "FRANCES"],
    disciplina: "DRENAGEM",
    servico: "DRENO_FRANCES",
    prioridade: 85,
  },
  {
    match: ["DRENAGEM"],
    disciplina: "DRENAGEM",
    prioridade: 65,
  },

  // =========================================
  // TERRAPLANAGEM / SOLO / COMPACTACAO
  // =========================================
  {
    match: ["TERRAPLANAGEM"],
    disciplina: "TERRAPLANAGEM",
    prioridade: 70,
  },
  {
    match: ["ESCAVAC", "MECAN"],
    disciplina: "TERRAPLANAGEM",
    servico: "ESCAVACAO_MECANICA",
    prioridade: 85,
  },
  {
    match: ["ESCAVAC", "MANUAL"],
    disciplina: "TERRAPLANAGEM",
    servico: "ESCAVACAO_MANUAL",
    prioridade: 85,
  },
  {
    match: ["COMPACTAC", "SOLO"],
    disciplina: "TERRAPLANAGEM",
    servico: "COMPACTACAO_DE_SOLO",
    prioridade: 90,
  },
  {
    match: ["COMPACTAC"],
    disciplina: "TERRAPLANAGEM",
    servico: "COMPACTACAO_DE_SOLO",
    prioridade: 85,
  },
  {
    match: ["REGULARIZAC", "SUBLEITO"],
    disciplina: "TERRAPLANAGEM",
    servico: "REGULARIZACAO_DO_SUBLEITO",
    prioridade: 90,
  },
  {
    match: ["SUBLEITO"],
    disciplina: "TERRAPLANAGEM",
    servico: "REGULARIZACAO_DO_SUBLEITO",
    prioridade: 75,
  },
  {
    match: ["LIMPEZA", "TERRENO"],
    disciplina: "TERRAPLANAGEM",
    servico: "LIMPEZA_DE_TERRENO",
    prioridade: 80,
  },
  {
    match: ["DESTOCAMENTO"],
    disciplina: "TERRAPLANAGEM",
    servico: "DESTOCAMENTO",
    prioridade: 85,
  },
  {
    match: ["DESTOCA"],
    disciplina: "TERRAPLANAGEM",
    servico: "DESTOCAMENTO",
    prioridade: 80,
  },
  {
    match: ["ATERRO", "COMPACTADO"],
    disciplina: "TERRAPLANAGEM",
    servico: "ATERRO_COMPACTADO",
    prioridade: 90,
  },
  {
    match: ["ATERRO"],
    disciplina: "TERRAPLANAGEM",
    servico: "ATERRO",
    prioridade: 75,
  },
  {
    match: ["REATERRO"],
    disciplina: "TERRAPLANAGEM",
    servico: "REATERRO",
    prioridade: 80,
  },
  {
    match: ["CORTE", "SOLO"],
    disciplina: "TERRAPLANAGEM",
    servico: "CORTE_SOLO",
    prioridade: 85,
  },
  {
    match: ["BOTA", "FORA"],
    disciplina: "TERRAPLANAGEM",
    servico: "BOTA_FORA",
    prioridade: 85,
  },
  {
    match: ["CARGA", "MATERIAL"],
    disciplina: "TERRAPLANAGEM",
    servico: "CARGA_MATERIAL",
    prioridade: 80,
  },
  {
    match: ["TRANSPORTE", "MATERIAL"],
    disciplina: "TERRAPLANAGEM",
    servico: "TRANSPORTE_MATERIAL",
    prioridade: 80,
  },

  // =========================================
  // PAVIMENTACAO / BRITA / LASTRO / CBUQ
  // =========================================
  {
    match: ["LASTRO", "BRITA", "CALCADA"],
    disciplina: "PAVIMENTACAO",
    servico: "PEDRA_ASSENTADA",
    prioridade: 95,
  },
  {
    match: ["LASTRO", "BRITA"],
    disciplina: "PAVIMENTACAO",
    servico: "PEDRA_ASSENTADA",
    prioridade: 90,
  },
  {
    match: ["BRITA", "CORRIDA"],
    disciplina: "PAVIMENTACAO",
    servico: "BRITA_CORRIDA",
    prioridade: 85,
  },
  {
    match: ["BRITA", "GRADUADA"],
    disciplina: "PAVIMENTACAO",
    servico: "BRITA_GRADUADA",
    prioridade: 85,
  },
  {
    match: ["BGS"],
    disciplina: "PAVIMENTACAO",
    servico: "BGS",
    prioridade: 90,
  },
  {
    match: ["RACHAO"],
    disciplina: "PAVIMENTACAO",
    servico: "RACHAO",
    prioridade: 85,
  },
  {
    match: ["CBUQ", "BINDER"],
    disciplina: "PAVIMENTACAO",
    servico: "CBUQ_BINDER",
    prioridade: 95,
  },
  {
    match: ["CBUQ", "ROLAMENTO"],
    disciplina: "PAVIMENTACAO",
    servico: "CBUQ_ROLAMENTO",
    prioridade: 95,
  },
  {
    match: ["CBUQ"],
    disciplina: "PAVIMENTACAO",
    servico: "EXECUCAO_DE_CBUQ",
    prioridade: 90,
  },
  {
    match: ["FRESAGEM", "ASFALTO"],
    disciplina: "PAVIMENTACAO",
    servico: "FRESAGEM_ASFALTO",
    prioridade: 95,
  },
  {
    match: ["FRESAGEM"],
    disciplina: "PAVIMENTACAO",
    servico: "FRESAGEM",
    prioridade: 90,
  },
  {
    match: ["IMPRIMAC", "ASFALTICA"],
    disciplina: "PAVIMENTACAO",
    servico: "IMPRIMACAO_ASFALTICA",
    prioridade: 95,
  },
  {
    match: ["IMPRIMAC"],
    disciplina: "PAVIMENTACAO",
    servico: "IMPRIMACAO",
    prioridade: 85,
  },
  {
    match: ["PINTURA", "LIGAC"],
    disciplina: "PAVIMENTACAO",
    servico: "PINTURA_DE_LIGACAO",
    prioridade: 90,
  },
  {
    match: ["TAPA", "BURACO"],
    disciplina: "PAVIMENTACAO",
    servico: "OPERACAO_TAPA_BURACO",
    prioridade: 95,
  },
  {
    match: ["REMENDO", "PROFUNDO"],
    disciplina: "PAVIMENTACAO",
    servico: "REMENDO_PROFUNDO",
    prioridade: 90,
  },
  {
    match: ["REMENDO", "SUPERFICIAL"],
    disciplina: "PAVIMENTACAO",
    servico: "REMENDO_SUPERFICIAL",
    prioridade: 90,
  },
  {
    match: ["REMENDO"],
    disciplina: "PAVIMENTACAO",
    servico: "REMENDO_PROFUNDO",
    prioridade: 75,
  },
  {
    match: ["RECAPEAMENTO"],
    disciplina: "PAVIMENTACAO",
    servico: "RECAPAGEM",
    prioridade: 85,
  },
  {
    match: ["RECAPAGEM"],
    disciplina: "PAVIMENTACAO",
    servico: "RECAPAGEM",
    prioridade: 85,
  },
  {
    match: ["MICRORREVESTIMENTO"],
    disciplina: "PAVIMENTACAO",
    servico: "MICRORREVESTIMENTO",
    prioridade: 90,
  },
  {
    match: ["MICROREVESTIMENTO"],
    disciplina: "PAVIMENTACAO",
    servico: "MICROREVESTIMENTO",
    prioridade: 90,
  },
  {
    match: ["LAMA", "ASFALTICA"],
    disciplina: "PAVIMENTACAO",
    servico: "LAMA_ASFALTICA",
    prioridade: 90,
  },
  {
    match: ["TRATAMENTO", "SUPERFICIAL"],
    disciplina: "PAVIMENTACAO",
    servico: "TRATAMENTO_SUPERFICIAL",
    prioridade: 85,
  },
  {
    match: ["TSS"],
    disciplina: "PAVIMENTACAO",
    servico: "TSS_TRATAMENTO_SIMPLES",
    prioridade: 85,
  },
  {
    match: ["TSD"],
    disciplina: "PAVIMENTACAO",
    servico: "TSD_TRATAMENTO_DUPLO",
    prioridade: 85,
  },
  {
    match: ["SELAGEM", "TRINCA"],
    disciplina: "PAVIMENTACAO",
    servico: "SELAGEM_TRINCA",
    prioridade: 90,
  },
  {
    match: ["SOLO", "BRITA"],
    disciplina: "PAVIMENTACAO",
    servico: "SOLO_BRITA",
    prioridade: 85,
  },
  {
    match: ["SOLO", "CIMENTO"],
    disciplina: "PAVIMENTACAO",
    servico: "SOLO_CIMENTO",
    prioridade: 85,
  },
  {
    match: ["MACADAME"],
    disciplina: "PAVIMENTACAO",
    servico: "MACADAME_HIDRAULICO",
    prioridade: 85,
  },
  {
    match: ["PAVIMENTAC"],
    disciplina: "PAVIMENTACAO",
    prioridade: 65,
  },
  {
    match: ["ASFALTO"],
    disciplina: "PAVIMENTACAO",
    prioridade: 60,
  },

  // =========================================
  // GUIAS, SARJETAS E CALCADAS
  // =========================================
  {
    match: ["EXECUC", "GUIA"],
    disciplina: "PAVIMENTACAO",
    servico: "EXECUCAO_DE_GUIA",
    prioridade: 90,
  },
  {
    match: ["MEIA", "GUIA"],
    disciplina: "PAVIMENTACAO",
    servico: "EXECUCAO_DE_MEIA_GUIA",
    prioridade: 90,
  },
  {
    match: ["REBAIXO", "GUIA"],
    disciplina: "PAVIMENTACAO",
    servico: "REBAIXO_DE_GUIA",
    prioridade: 90,
  },
  {
    match: ["RECOMPOSIC", "CALCADA"],
    disciplina: "PAVIMENTACAO",
    servico: "RECOMPOSICAO_DE_CALCADA",
    prioridade: 90,
  },
  {
    match: ["PISO", "INTERTRAVADO"],
    disciplina: "PAVIMENTACAO",
    servico: "PISO_INTERTRAVADO",
    prioridade: 95,
  },
  {
    match: ["PISO", "CONCRETO"],
    disciplina: "PAVIMENTACAO",
    servico: "PISO_DE_CONCRETO",
    prioridade: 90,
  },
  {
    match: ["CALCADA", "ACESSIVEL"],
    disciplina: "PAVIMENTACAO",
    servico: "CALCADA_ACESSIVEL",
    prioridade: 95,
  },
  {
    match: ["CONTRAPISO"],
    disciplina: "PAVIMENTACAO",
    servico: "CONTRAPISO",
    prioridade: 85,
  },

  // =========================================
  // SINALIZACAO / DEFENSA / NEW JERSEY
  // =========================================
  {
    match: ["SINALIZAC", "HORIZONTAL"],
    disciplina: "SINALIZACAO",
    servico: "SINALIZACAO_HORIZONTAL",
    prioridade: 90,
  },
  {
    match: ["SINALIZAC", "VERTICAL"],
    disciplina: "SINALIZACAO",
    servico: "SINALIZACAO_VERTICAL",
    prioridade: 90,
  },
  {
    match: ["PINTURA", "FAIXA"],
    disciplina: "SINALIZACAO",
    servico: "PINTURA_DE_FAIXAS",
    prioridade: 90,
  },
  {
    match: ["PINTURA", "EIXO"],
    disciplina: "SINALIZACAO",
    servico: "PINTURA_DE_EIXO",
    prioridade: 90,
  },
  {
    match: ["PINTURA", "SETA"],
    disciplina: "SINALIZACAO",
    servico: "PINTURA_SETA",
    prioridade: 90,
  },
  {
    match: ["PINTURA", "LEGENDA"],
    disciplina: "SINALIZACAO",
    servico: "PINTURA_LEGENDA",
    prioridade: 90,
  },
  {
    match: ["PINTURA", "ZEBRADO"],
    disciplina: "SINALIZACAO",
    servico: "PINTURA_ZEBRADO",
    prioridade: 90,
  },
  {
    match: ["DEFENSA", "METAL"],
    disciplina: "SINALIZACAO",
    servico: "DEFENSA_METALICA",
    prioridade: 90,
  },
  {
    match: ["GUARD", "RAIL"],
    disciplina: "SINALIZACAO",
    servico: "GUARD_RAIL",
    prioridade: 90,
  },
  {
    match: ["NEW", "JERSEY", "CONCRETO"],
    disciplina: "SINALIZACAO",
    servico: "NEW_JERSEY_CONCRETO",
    prioridade: 95,
  },
  {
    match: ["NEW", "JERSEY", "PLASTICO"],
    disciplina: "SINALIZACAO",
    servico: "NEW_JERSEY_PLASTICO",
    prioridade: 95,
  },
  {
    match: ["NEW", "JERSEY"],
    disciplina: "SINALIZACAO",
    servico: "NEW_JERSEY_CONCRETO",
    prioridade: 90,
  },
  {
    match: ["TACHAO"],
    disciplina: "SINALIZACAO",
    servico: "TACHAO",
    prioridade: 85,
  },
  {
    match: ["TACHAS", "REFLETIVAS"],
    disciplina: "SINALIZACAO",
    servico: "TACHAS_REFLETIVAS",
    prioridade: 90,
  },
  {
    match: ["TARTARUGA"],
    disciplina: "SINALIZACAO",
    servico: "TARTARUGA",
    prioridade: 85,
  },
  {
    match: ["PLACA", "SINALIZAC"],
    disciplina: "SINALIZACAO",
    servico: "PLACA_DE_SINALIZACAO",
    prioridade: 90,
  },
  {
    match: ["IMPLANTAC", "PLACA"],
    disciplina: "SINALIZACAO",
    servico: "IMPLANTACAO_DE_PLACAS",
    prioridade: 90,
  },
  {
    match: ["BALIZADOR"],
    disciplina: "SINALIZACAO",
    servico: "BALIZADOR",
    prioridade: 85,
  },
  {
    match: ["TERMOPLAST"],
    disciplina: "SINALIZACAO",
    servico: "TERMOPLASTICO",
    prioridade: 90,
  },
  {
    match: ["SINALIZAC", "PROVISORIA"],
    disciplina: "SINALIZACAO",
    servico: "SINALIZACAO_PROVISORIA",
    prioridade: 85,
  },
  {
    match: ["SINALIZAC"],
    disciplina: "SINALIZACAO",
    prioridade: 65,
  },
  {
    match: ["PLACA", "REGULAMENTAC"],
    disciplina: "SINALIZACAO",
    servico: "PLACA_REGULAMENTACAO",
    prioridade: 90,
  },
  {
    match: ["PLACA", "ADVERTENCIA"],
    disciplina: "SINALIZACAO",
    servico: "PLACA_ADVERTENCIA",
    prioridade: 90,
  },
  {
    match: ["PLACA", "INDICATIVA"],
    disciplina: "SINALIZACAO",
    servico: "PLACA_INDICATIVA",
    prioridade: 90,
  },
  {
    match: ["PORTICO"],
    disciplina: "SINALIZACAO",
    servico: "PORTICO",
    prioridade: 85,
  },
  {
    match: ["SEMI", "PORTICO"],
    disciplina: "SINALIZACAO",
    servico: "SEMI_PORTICO",
    prioridade: 90,
  },
  {
    match: ["BARREIRA", "RIGIDA"],
    disciplina: "SINALIZACAO",
    servico: "BARREIRA_RIGIDA",
    prioridade: 90,
  },
  {
    match: ["ATENUADOR", "IMPACTO"],
    disciplina: "SINALIZACAO",
    servico: "ATENUADOR_IMPACTO",
    prioridade: 95,
  },
  {
    match: ["TERMINAL", "ANCORA"],
    disciplina: "SINALIZACAO",
    servico: "TERMINAL_ANCORA",
    prioridade: 95,
  },

  // =========================================
  // PAISAGISMO / GRAMA / ROCADA / CAPINA
  // =========================================
  {
    match: ["PAISAGISMO"],
    disciplina: "PAISAGISMO",
    prioridade: 70,
  },
  {
    match: ["PLANTIO", "GRAMA"],
    disciplina: "PAISAGISMO",
    servico: "PLANTIO_GRAMA",
    prioridade: 95,
  },
  {
    match: ["HIDROSSEMEADURA"],
    disciplina: "PAISAGISMO",
    servico: "HIDROSSEMEADURA",
    prioridade: 95,
  },
  {
    match: ["PLANTIO", "ARVORE"],
    disciplina: "PAISAGISMO",
    servico: "PLANTIO_ARVORES",
    prioridade: 95,
  },
  {
    match: ["PLANTIO", "ARBUSTO"],
    disciplina: "PAISAGISMO",
    servico: "PLANTIO_ARBUSTOS",
    prioridade: 90,
  },
  {
    match: ["PODA"],
    disciplina: "PAISAGISMO",
    servico: "PODA",
    prioridade: 80,
  },
  {
    match: ["ADUBAC"],
    disciplina: "PAISAGISMO",
    servico: "ADUBACAO",
    prioridade: 80,
  },
  {
    match: ["JARDINAGEM"],
    disciplina: "PAISAGISMO",
    servico: "JARDINAGEM",
    prioridade: 80,
  },
  {
    match: ["PREPARO", "SOLO"],
    disciplina: "PAISAGISMO",
    servico: "PREPARO_DE_SOLO",
    prioridade: 85,
  },
  {
    match: ["IRRIGAC"],
    disciplina: "PAISAGISMO",
    servico: "IRRIGACAO_MANUAL",
    prioridade: 75,
  },

  // =========================================
  // MANUTENCAO / ROCADA / CONSERVACAO
  // =========================================
  {
    match: ["ROCADA", "MECAN"],
    disciplina: "MANUTENCAO",
    servico: "ROCADA_MECANIZADA",
    prioridade: 90,
  },
  {
    match: ["ROCADA", "MANUAL"],
    disciplina: "MANUTENCAO",
    servico: "ROCADA_MANUTENCAO",
    prioridade: 90,
  },
  {
    match: ["ROCADA"],
    disciplina: "MANUTENCAO",
    servico: "ROCADA_MECANIZADA",
    prioridade: 75,
  },
  {
    match: ["CAPINA"],
    disciplina: "MANUTENCAO",
    servico: "LIMPEZA_FAIXA",
    prioridade: 70,
  },
  {
    match: ["LIMPEZA", "FAIXA"],
    disciplina: "MANUTENCAO",
    servico: "LIMPEZA_FAIXA",
    prioridade: 85,
  },
  {
    match: ["LIMPEZA", "SARJETA"],
    disciplina: "MANUTENCAO",
    servico: "LIMPEZA_SARJETA",
    prioridade: 90,
  },
  {
    match: ["LIMPEZA", "BUEIRO"],
    disciplina: "MANUTENCAO",
    servico: "LIMPEZA_BUEIRO",
    prioridade: 90,
  },
  {
    match: ["DESOBSTRUC"],
    disciplina: "MANUTENCAO",
    servico: "DESOBSTRUCAO",
    prioridade: 85,
  },
  {
    match: ["MANUTENC", "PREVENTIVA"],
    disciplina: "MANUTENCAO",
    servico: "MANUTENCAO_PREVENTIVA",
    prioridade: 90,
  },
  {
    match: ["MANUTENC", "CORRETIVA"],
    disciplina: "MANUTENCAO",
    servico: "MANUTENCAO_CORRETIVA",
    prioridade: 90,
  },
  {
    match: ["MANUTENC"],
    disciplina: "MANUTENCAO",
    prioridade: 65,
  },
  {
    match: ["CONSERVAC"],
    disciplina: "MANUTENCAO",
    servico: "CONSERVACAO",
    prioridade: 70,
  },
  {
    match: ["VISTORIA"],
    disciplina: "MANUTENCAO",
    servico: "VISTORIA_TECNICA",
    prioridade: 80,
  },
  {
    match: ["INSPECAO", "VISUAL"],
    disciplina: "MANUTENCAO",
    servico: "INSPECAO_VISUAL",
    prioridade: 85,
  },
  {
    match: ["INSPECAO"],
    disciplina: "MANUTENCAO",
    servico: "INSPECAO_VISUAL",
    prioridade: 75,
  },

  // =========================================
  // ESTRUTURA / FUNDACAO / CONCRETO / FORMAS
  // =========================================
  {
    match: ["CONCRET", "FUNDAC"],
    disciplina: "ESTRUTURA",
    servico: "CONCRETAGEM",
    prioridade: 95,
  },
  {
    match: ["CONCRETAGEM"],
    disciplina: "ESTRUTURA",
    servico: "CONCRETAGEM",
    prioridade: 90,
  },
  {
    match: ["LANCAMENTO", "CONCRETO"],
    disciplina: "ESTRUTURA",
    servico: "LANCAMENTO_CONCRETO",
    prioridade: 90,
  },
  {
    match: ["CURA", "CONCRETO"],
    disciplina: "ESTRUTURA",
    servico: "CURA_CONCRETO",
    prioridade: 90,
  },
  {
    match: ["ARMAC", "ACO"],
    disciplina: "ESTRUTURA",
    servico: "ARMACAO_DE_ACO",
    prioridade: 90,
  },
  {
    match: ["ARMADURA"],
    disciplina: "ESTRUTURA",
    servico: "ARMACAO_DE_ACO",
    prioridade: 85,
  },
  {
    match: ["FORMA", "MADEIRA"],
    disciplina: "ESTRUTURA",
    servico: "FORMA_MADEIRA",
    prioridade: 90,
  },
  {
    match: ["FORMA", "METALICA"],
    disciplina: "ESTRUTURA",
    servico: "FORMA_METALICA",
    prioridade: 90,
  },
  {
    match: ["FORMAS"],
    disciplina: "ESTRUTURA",
    servico: "FORMAS",
    prioridade: 80,
  },
  {
    match: ["DESFORMA"],
    disciplina: "ESTRUTURA",
    servico: "DESFORMA",
    prioridade: 85,
  },
  {
    match: ["ESCORAMENTO"],
    disciplina: "ESTRUTURA",
    servico: "ESCORAMENTO",
    prioridade: 85,
  },
  {
    match: ["PILAR", "CONCRETO"],
    disciplina: "ESTRUTURA",
    servico: "PILAR_CONCRETO",
    prioridade: 90,
  },
  {
    match: ["VIGA", "CONCRETO"],
    disciplina: "ESTRUTURA",
    servico: "VIGA_CONCRETO",
    prioridade: 90,
  },
  {
    match: ["LAJE", "MACICA"],
    disciplina: "ESTRUTURA",
    servico: "LAJE_MACICA",
    prioridade: 90,
  },
  {
    match: ["LAJE", "NERVURADA"],
    disciplina: "ESTRUTURA",
    servico: "LAJE_NERVURADA",
    prioridade: 90,
  },
  {
    match: ["LAJE", "PRE", "MOLDADA"],
    disciplina: "ESTRUTURA",
    servico: "LAJE_PRE_MOLDADA",
    prioridade: 95,
  },
  {
    match: ["PROTENSAO"],
    disciplina: "ESTRUTURA",
    servico: "PROTENSAO",
    prioridade: 90,
  },
  {
    match: ["SAPATA", "CORRIDA"],
    disciplina: "ESTRUTURA",
    servico: "SAPATA_CORRIDA",
    prioridade: 90,
  },
  {
    match: ["SAPATA", "ISOLADA"],
    disciplina: "ESTRUTURA",
    servico: "SAPATA_ISOLADA",
    prioridade: 90,
  },
  {
    match: ["SAPATA"],
    disciplina: "ESTRUTURA",
    servico: "SAPATA",
    prioridade: 80,
  },
  {
    match: ["BLOCO", "FUNDAC"],
    disciplina: "ESTRUTURA",
    servico: "BLOCO_FUNDACAO",
    prioridade: 90,
  },
  {
    match: ["BALDRAME"],
    disciplina: "ESTRUTURA",
    servico: "BALDRAME",
    prioridade: 85,
  },
  {
    match: ["VIGA", "BALDRAME"],
    disciplina: "ESTRUTURA",
    servico: "VIGA_BALDRAME",
    prioridade: 90,
  },
  {
    match: ["ESTACA", "HELICE"],
    disciplina: "ESTRUTURA",
    servico: "ESTACA_HELICE_CONTINUA",
    prioridade: 95,
  },
  {
    match: ["ESTACA", "RAIZ"],
    disciplina: "ESTRUTURA",
    servico: "ESTACA_RAIZ",
    prioridade: 95,
  },
  {
    match: ["ESTACA", "ESCAVADA"],
    disciplina: "ESTRUTURA",
    servico: "ESTACA_ESCAVADA",
    prioridade: 95,
  },
  {
    match: ["ESTACA", "PRE", "MOLDADA"],
    disciplina: "ESTRUTURA",
    servico: "ESTACA_PRE_MOLDADA",
    prioridade: 95,
  },
  {
    match: ["ESTACA", "BROCA"],
    disciplina: "ESTRUTURA",
    servico: "ESTACA_BROCA",
    prioridade: 90,
  },
  {
    match: ["TUBULAO"],
    disciplina: "ESTRUTURA",
    servico: "TUBULAO",
    prioridade: 90,
  },
  {
    match: ["RADIER"],
    disciplina: "ESTRUTURA",
    servico: "RADIER",
    prioridade: 90,
  },
  {
    match: ["LASTRO", "CONCRETO"],
    disciplina: "ESTRUTURA",
    servico: "LASTRO_CONCRETO",
    prioridade: 90,
  },
  {
    match: ["ESTRUTURA", "METALICA"],
    disciplina: "ESTRUTURA",
    servico: "ESTRUTURA_METALICA",
    prioridade: 90,
  },
  {
    match: ["ESTRUTURA"],
    disciplina: "ESTRUTURA",
    prioridade: 60,
  },
  {
    match: ["FUNDAC"],
    disciplina: "ESTRUTURA",
    prioridade: 60,
  },

  // =========================================
  // OBRAS DE ARTE / CONTENCAO
  // =========================================
  {
    match: ["MURO", "ARRIMO"],
    disciplina: "OBRAS_ARTE_CORRENTES",
    servico: "MURO_DE_CONTENCAO",
    prioridade: 90,
  },
  {
    match: ["MURO", "CONTENC"],
    disciplina: "OBRAS_ARTE_CORRENTES",
    servico: "MURO_DE_CONTENCAO",
    prioridade: 90,
  },
  {
    match: ["GABIAO"],
    disciplina: "OBRAS_ARTE_CORRENTES",
    servico: "GABIAO",
    prioridade: 90,
  },
  {
    match: ["CORTINA", "ATIRANTADA"],
    disciplina: "OBRAS_ARTE_CORRENTES",
    servico: "CORTINA_ATIRANTADA",
    prioridade: 95,
  },
  {
    match: ["CONTENC"],
    disciplina: "OBRAS_ARTE_CORRENTES",
    servico: "MURO_DE_CONTENCAO",
    prioridade: 75,
  },
  {
    match: ["ENROCAMENTO"],
    disciplina: "OBRAS_ARTE_CORRENTES",
    servico: "ENROCAMENTO",
    prioridade: 85,
  },
  {
    match: ["RIP", "RAP"],
    disciplina: "OBRAS_ARTE_CORRENTES",
    servico: "RIP_RAP",
    prioridade: 85,
  },
  {
    match: ["ESCADA", "DISSIPADORA"],
    disciplina: "OBRAS_ARTE_CORRENTES",
    servico: "ESCADA_DISSIPADORA",
    prioridade: 90,
  },
  {
    match: ["ESCADA", "HIDRAULICA"],
    disciplina: "OBRAS_ARTE_CORRENTES",
    servico: "ESCADA_HIDRAULICA",
    prioridade: 90,
  },
  {
    match: ["BACIA", "AMORTECIMENTO"],
    disciplina: "OBRAS_ARTE_CORRENTES",
    servico: "BACIA_AMORTECIMENTO",
    prioridade: 90,
  },
  {
    match: ["DISSIPADOR"],
    disciplina: "OBRAS_ARTE_CORRENTES",
    servico: "ESCADA_DISSIPADORA",
    prioridade: 80,
  },
  {
    match: ["CAIXA", "COLETORA"],
    disciplina: "OBRAS_ARTE_CORRENTES",
    servico: "CAIXA_COLETORA",
    prioridade: 85,
  },

  // =========================================
  // ALVENARIA / ACABAMENTO
  // =========================================
  {
    match: ["ALVENARIA", "ESTRUTURAL"],
    disciplina: "ACABAMENTO",
    servico: "ALVENARIA_ESTRUTURAL",
    prioridade: 90,
  },
  {
    match: ["ALVENARIA", "VEDAC"],
    disciplina: "ACABAMENTO",
    servico: "ALVENARIA_VEDACAO",
    prioridade: 90,
  },
  {
    match: ["ALVENARIA", "TIJOLO"],
    disciplina: "ACABAMENTO",
    servico: "ALVENARIA_TIJOLO",
    prioridade: 90,
  },
  {
    match: ["ALVENARIA", "BLOCO"],
    disciplina: "ACABAMENTO",
    servico: "ALVENARIA_BLOCO_CONCRETO",
    prioridade: 85,
  },
  {
    match: ["ALVENARIA"],
    disciplina: "ACABAMENTO",
    servico: "ALVENARIA_VEDACAO",
    prioridade: 70,
  },
  {
    match: ["CHAPISCO"],
    disciplina: "ACABAMENTO",
    servico: "CHAPISCO",
    prioridade: 85,
  },
  {
    match: ["EMBOCO"],
    disciplina: "ACABAMENTO",
    servico: "EMBOCO",
    prioridade: 85,
  },
  {
    match: ["REBOCO"],
    disciplina: "ACABAMENTO",
    servico: "REBOCO",
    prioridade: 85,
  },
  {
    match: ["MASSA", "CORRIDA"],
    disciplina: "ACABAMENTO",
    servico: "MASSA_CORRIDA",
    prioridade: 90,
  },
  {
    match: ["MASSA", "ACRILICA"],
    disciplina: "ACABAMENTO",
    servico: "MASSA_ACRILICA",
    prioridade: 90,
  },
  {
    match: ["PINTURA", "INTERNA"],
    disciplina: "ACABAMENTO",
    servico: "PINTURA_INTERNA",
    prioridade: 90,
  },
  {
    match: ["PINTURA", "EXTERNA"],
    disciplina: "ACABAMENTO",
    servico: "PINTURA_EXTERNA",
    prioridade: 90,
  },
  {
    match: ["TEXTURA"],
    disciplina: "ACABAMENTO",
    servico: "TEXTURA",
    prioridade: 85,
  },
  {
    match: ["VERNIZ"],
    disciplina: "ACABAMENTO",
    servico: "VERNIZ",
    prioridade: 85,
  },
  {
    match: ["ACABAMENTO", "INTERNO"],
    disciplina: "ACABAMENTO_INTERNO",
    prioridade: 70,
  },
  {
    match: ["ACABAMENTO", "EXTERNO"],
    disciplina: "ACABAMENTO_EXTERNO",
    prioridade: 70,
  },
  {
    match: ["ACABAMENTO"],
    disciplina: "ACABAMENTO",
    prioridade: 60,
  },
  {
    match: ["REVESTIMENTO", "CERAMICO"],
    disciplina: "ACABAMENTO",
    servico: "REVESTIMENTO_CERAMICO",
    prioridade: 90,
  },
  {
    match: ["PORCELANATO"],
    disciplina: "ACABAMENTO",
    servico: "PORCELANATO",
    prioridade: 85,
  },
  {
    match: ["REJUNTAMENTO"],
    disciplina: "ACABAMENTO",
    servico: "REJUNTAMENTO",
    prioridade: 85,
  },
  {
    match: ["VERGA"],
    disciplina: "ACABAMENTO",
    servico: "VERGA",
    prioridade: 80,
  },
  {
    match: ["CONTRAVERGA"],
    disciplina: "ACABAMENTO",
    servico: "CONTRAVERGA",
    prioridade: 80,
  },

  // =========================================
  // INSTALACOES ELETRICAS
  // =========================================
  {
    match: ["INSTALAC", "ELETRICA"],
    disciplina: "INSTALACOES_ELETRICAS",
    prioridade: 80,
  },
  {
    match: ["ELETRODUTO"],
    disciplina: "INSTALACOES_ELETRICAS",
    servico: "ELETRODUTO",
    prioridade: 85,
  },
  {
    match: ["FIACAO"],
    disciplina: "INSTALACOES_ELETRICAS",
    servico: "FIACAO",
    prioridade: 85,
  },
  {
    match: ["PASSAGEM", "FIOS"],
    disciplina: "INSTALACOES_ELETRICAS",
    servico: "PASSAGEM_DE_FIOS",
    prioridade: 90,
  },
  {
    match: ["QUADRO", "DISTRIBUIC"],
    disciplina: "INSTALACOES_ELETRICAS",
    servico: "QUADRO_DISTRIBUICAO",
    prioridade: 90,
  },
  {
    match: ["INSTALAC", "QUADRO"],
    disciplina: "INSTALACOES_ELETRICAS",
    servico: "INSTALACAO_DE_QUADRO",
    prioridade: 90,
  },
  {
    match: ["DISJUNTOR"],
    disciplina: "INSTALACOES_ELETRICAS",
    servico: "DISJUNTOR",
    prioridade: 85,
  },
  {
    match: ["TOMADA"],
    disciplina: "INSTALACOES_ELETRICAS",
    servico: "TOMADAS",
    prioridade: 80,
  },
  {
    match: ["INTERRUPTOR"],
    disciplina: "INSTALACOES_ELETRICAS",
    servico: "INTERRUPTORES",
    prioridade: 80,
  },
  {
    match: ["ILUMINAC"],
    disciplina: "INSTALACOES_ELETRICAS",
    servico: "ILUMINACAO",
    prioridade: 75,
  },
  {
    match: ["LUMINARIA"],
    disciplina: "INSTALACOES_ELETRICAS",
    servico: "LUMINARIA",
    prioridade: 85,
  },
  {
    match: ["POSTE", "ILUMINAC"],
    disciplina: "INSTALACOES_ELETRICAS",
    servico: "POSTE_ILUMINACAO",
    prioridade: 90,
  },
  {
    match: ["ATERRAMENTO"],
    disciplina: "INSTALACOES_ELETRICAS",
    servico: "ATERRAMENTO",
    prioridade: 85,
  },
  {
    match: ["SPDA"],
    disciplina: "INSTALACOES_ELETRICAS",
    servico: "SPDA",
    prioridade: 90,
  },
  {
    match: ["PARA", "RAIOS"],
    disciplina: "INSTALACOES_ELETRICAS",
    servico: "PARA_RAIOS",
    prioridade: 90,
  },

  // =========================================
  // INSTALACOES HIDROSSANITARIAS
  // =========================================
  {
    match: ["INSTALAC", "HIDRO"],
    disciplina: "INSTALACOES_HIDROSANITARIAS",
    prioridade: 80,
  },
  {
    match: ["TUBULAC", "AGUA", "FRIA"],
    disciplina: "INSTALACOES_HIDROSANITARIAS",
    servico: "TUBULACAO_AGUA_FRIA",
    prioridade: 95,
  },
  {
    match: ["TUBULAC", "AGUA", "QUENTE"],
    disciplina: "INSTALACOES_HIDROSANITARIAS",
    servico: "TUBULACAO_AGUA_QUENTE",
    prioridade: 95,
  },
  {
    match: ["TUBULAC", "ESGOTO"],
    disciplina: "INSTALACOES_HIDROSANITARIAS",
    servico: "TUBULACAO_ESGOTO",
    prioridade: 95,
  },
  {
    match: ["TUBULAC", "PLUVIAL"],
    disciplina: "INSTALACOES_HIDROSANITARIAS",
    servico: "TUBULACAO_PLUVIAL",
    prioridade: 95,
  },
  {
    match: ["CAIXA", "GORDURA"],
    disciplina: "INSTALACOES_HIDROSANITARIAS",
    servico: "CAIXA_GORDURA",
    prioridade: 90,
  },
  {
    match: ["CAIXA", "INSPEC"],
    disciplina: "INSTALACOES_HIDROSANITARIAS",
    servico: "CAIXA_INSPECAO",
    prioridade: 90,
  },
  {
    match: ["FOSSA", "SEPTICA"],
    disciplina: "INSTALACOES_HIDROSANITARIAS",
    servico: "FOSSA_SEPTICA",
    prioridade: 95,
  },
  {
    match: ["FOSSA"],
    disciplina: "INSTALACOES_HIDROSANITARIAS",
    servico: "FOSSA",
    prioridade: 80,
  },
  {
    match: ["SUMIDOURO"],
    disciplina: "INSTALACOES_HIDROSANITARIAS",
    servico: "SUMIDOURO",
    prioridade: 90,
  },
  {
    match: ["CAIXA", "DAGUA"],
    disciplina: "INSTALACOES_HIDROSANITARIAS",
    servico: "CAIXA_DAGUA",
    prioridade: 90,
  },
  {
    match: ["BOMBA"],
    disciplina: "INSTALACOES_HIDROSANITARIAS",
    servico: "BOMBAS",
    prioridade: 75,
  },

  // =========================================
  // COBERTURA / TELHADO
  // =========================================
  {
    match: ["ESTRUTURA", "TELHADO"],
    disciplina: "COBERTURA",
    servico: "ESTRUTURA_DE_TELHADO",
    prioridade: 90,
  },
  {
    match: ["TELHAMENTO"],
    disciplina: "COBERTURA",
    servico: "TELHAMENTO",
    prioridade: 85,
  },
  {
    match: ["TELHA", "CERAMICA"],
    disciplina: "COBERTURA",
    servico: "TELHA_CERAMICA",
    prioridade: 90,
  },
  {
    match: ["TELHA", "METALICA"],
    disciplina: "COBERTURA",
    servico: "TELHA_METALICA",
    prioridade: 90,
  },
  {
    match: ["TELHA", "FIBROCIMENTO"],
    disciplina: "COBERTURA",
    servico: "TELHA_FIBROCIMENTO",
    prioridade: 90,
  },
  {
    match: ["CALHA", "BEIRAL"],
    disciplina: "COBERTURA",
    servico: "CALHA_BEIRAL",
    prioridade: 90,
  },
  {
    match: ["CALHA"],
    disciplina: "COBERTURA",
    servico: "CALHAS",
    prioridade: 80,
  },
  {
    match: ["RUFO"],
    disciplina: "COBERTURA",
    servico: "RUFOS",
    prioridade: 80,
  },
  {
    match: ["CUMEEIRA"],
    disciplina: "COBERTURA",
    servico: "CUMEEIRA",
    prioridade: 85,
  },
  {
    match: ["IMPERMEABILIZAC", "MANTA"],
    disciplina: "COBERTURA",
    servico: "IMPERMEABILIZACAO_MANTA",
    prioridade: 95,
  },
  {
    match: ["IMPERMEABILIZAC", "LIQUIDA"],
    disciplina: "COBERTURA",
    servico: "IMPERMEABILIZACAO_LIQUIDA",
    prioridade: 95,
  },
  {
    match: ["IMPERMEABILIZAC"],
    disciplina: "COBERTURA",
    servico: "IMPERMEABILIZACAO_MANTA",
    prioridade: 75,
  },
  {
    match: ["COBERTURA"],
    disciplina: "COBERTURA",
    prioridade: 65,
  },
  {
    match: ["TELHADO"],
    disciplina: "COBERTURA",
    prioridade: 65,
  },

  // =========================================
  // DEMOLIÇÃO / LIMPEZA
  // =========================================
  {
    match: ["DEMOLIC"],
    disciplina: "DEMOLICAO",
    servico: "DEMOLICAO",
    prioridade: 85,
  },
  {
    match: ["REMOC", "ENTULHO"],
    disciplina: "DEMOLICAO",
    servico: "REMOCAO_DE_ENTULHO",
    prioridade: 90,
  },
  {
    match: ["LIMPEZA", "FINAL"],
    disciplina: "LIMPEZA",
    servico: "LIMPEZA_FINAL",
    prioridade: 90,
  },
  {
    match: ["LIMPEZA", "OBRA"],
    disciplina: "LIMPEZA",
    servico: "LIMPEZA_DE_OBRA",
    prioridade: 85,
  },
  {
    match: ["REMOC", "RESIDUOS"],
    disciplina: "LIMPEZA",
    servico: "REMOCAO_DE_RESIDUOS",
    prioridade: 90,
  },
  {
    match: ["ORGANIZAC", "CANTEIRO"],
    disciplina: "LIMPEZA",
    servico: "ORGANIZACAO_DO_CANTEIRO",
    prioridade: 90,
  },

  // =========================================
  // SERVICOS PRELIMINARES / TOPOGRAFIA
  // =========================================
  {
    match: ["CANTEIRO", "OBRAS"],
    disciplina: "SERVICOS_PRELIMINARES",
    servico: "CANTEIRO_DE_OBRAS",
    prioridade: 90,
  },
  {
    match: ["TAPUME"],
    disciplina: "SERVICOS_PRELIMINARES",
    servico: "TAPUME",
    prioridade: 85,
  },
  {
    match: ["LOCAC", "OBRA"],
    disciplina: "SERVICOS_PRELIMINARES",
    servico: "LOCACAO_OBRA",
    prioridade: 90,
  },
  {
    match: ["LEVANTAMENTO", "TOPOGRAFICO"],
    disciplina: "SERVICOS_PRELIMINARES",
    servico: "LEVANTAMENTO_TOPOGRAFICO",
    prioridade: 95,
  },
  {
    match: ["TOPOGRAFIA"],
    disciplina: "SERVICOS_PRELIMINARES",
    servico: "LEVANTAMENTO_TOPOGRAFICO",
    prioridade: 85,
  },
  {
    match: ["SONDAGEM", "SPT"],
    disciplina: "SERVICOS_PRELIMINARES",
    servico: "SONDAGEM_SPT",
    prioridade: 95,
  },
  {
    match: ["SONDAGEM", "ROTATIVA"],
    disciplina: "SERVICOS_PRELIMINARES",
    servico: "SONDAGEM_ROTATIVA",
    prioridade: 95,
  },
  {
    match: ["SONDAGEM"],
    disciplina: "SERVICOS_PRELIMINARES",
    servico: "SONDAGEM_SPT",
    prioridade: 80,
  },
  {
    match: ["MOBILIZAC"],
    disciplina: "SERVICOS_PRELIMINARES",
    servico: "MOBILIZACAO",
    prioridade: 80,
  },
  {
    match: ["DESMOBILIZAC"],
    disciplina: "SERVICOS_PRELIMINARES",
    servico: "DESMOBILIZACAO",
    prioridade: 80,
  },
  {
    match: ["INSTALAC", "CANTEIRO"],
    disciplina: "SERVICOS_PRELIMINARES",
    servico: "INSTALACAO_CANTEIRO",
    prioridade: 90,
  },
  {
    match: ["PLACA", "OBRA"],
    disciplina: "SERVICOS_PRELIMINARES",
    servico: "PLACA_OBRA",
    prioridade: 85,
  },

  // =========================================
  // SEGURANÇA
  // =========================================
  {
    match: ["SEGURANCA", "TRABALHO"],
    disciplina: "SEGURANCA",
    servico: "SEGURANCA_TRABALHO",
    prioridade: 90,
  },
  {
    match: ["EPI"],
    disciplina: "SEGURANCA",
    servico: "EPI",
    prioridade: 85,
  },
  {
    match: ["EPC"],
    disciplina: "SEGURANCA",
    servico: "EPC",
    prioridade: 85,
  },
  {
    match: ["ISOLAMENTO"],
    disciplina: "SEGURANCA",
    servico: "ISOLAMENTO",
    prioridade: 80,
  },
  {
    match: ["DESVIO", "TRAFEGO"],
    disciplina: "SEGURANCA",
    servico: "DESVIO_TRAFEGO",
    prioridade: 90,
  },
  {
    match: ["TELA", "PROTEC"],
    disciplina: "SEGURANCA",
    servico: "TELA_PROTECAO",
    prioridade: 85,
  },
  {
    match: ["CERCA", "GUIA"],
    disciplina: "SEGURANCA",
    servico: "CERCA_GUIA",
    prioridade: 85,
  },
  {
    match: ["SEGURANCA"],
    disciplina: "SEGURANCA",
    prioridade: 65,
  },

  // =========================================
  // SERVICOS TECNICOS / CONTROLE
  // =========================================
  {
    match: ["CONTROLE", "TECNOLOGICO"],
    disciplina: "CONTROLE_TECNOLOGICO",
    servico: "CONTROLE_TECNOLOGICO",
    prioridade: 90,
  },
  {
    match: ["ENSAIO", "CAMPO"],
    disciplina: "CONTROLE_TECNOLOGICO",
    servico: "ENSAIO_CAMPO",
    prioridade: 90,
  },
  {
    match: ["ENSAIO", "LABORATORIO"],
    disciplina: "CONTROLE_TECNOLOGICO",
    servico: "ENSAIO_LABORATORIO",
    prioridade: 90,
  },
  {
    match: ["ENSAIO"],
    disciplina: "CONTROLE_TECNOLOGICO",
    servico: "ENSAIO",
    prioridade: 75,
  },
  {
    match: ["FISCALIZAC"],
    disciplina: "ADMINISTRACAO",
    servico: "FISCALIZACAO",
    prioridade: 80,
  },
  {
    match: ["MEDICAO"],
    disciplina: "ADMINISTRACAO",
    servico: "MEDICAO",
    prioridade: 80,
  },
  {
    match: ["DOCUMENTAC", "TECNICA"],
    disciplina: "ADMINISTRACAO",
    servico: "DOCUMENTACAO_TECNICA",
    prioridade: 85,
  },
  {
    match: ["REUNIAO", "OBRA"],
    disciplina: "ADMINISTRACAO",
    servico: "REUNIAO_OBRA",
    prioridade: 85,
  },
];
