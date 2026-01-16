/**
 * Regras determinísticas de inferência para classificação
 * Usado como fallback quando OCR/IA não retornam resultados completos
 */

// Normaliza texto para comparação
export function norm(s?: string | null): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Infere DISCIPLINA a partir do caminho da pasta
 * Regras determinísticas baseadas em palavras-chave
 */
export function inferDisciplinaFromPath(folderPath?: string): string {
  const p = norm(folderPath);
  
  // Drenagem
  if (p.includes('DRENAGEM') || p.includes('DRENO') || p.includes('BUEIRO') || 
      p.includes('SARJETA') || p.includes('VALETA') || p.includes('CANALETA')) {
    return 'DRENAGEM';
  }
  
  // Terraplanagem
  if (p.includes('TERRAPLANAGEM') || p.includes('TERRAPLENO') || 
      p.includes('ATERRO') || p.includes('CORTE') || p.includes('ESCAVACAO') ||
      p.includes('MOVIMENTO DE TERRA') || p.includes('MOV TERRA')) {
    return 'TERRAPLANAGEM';
  }
  
  // Pavimentação
  if (p.includes('PAVIMENT') || p.includes('ASFALTO') || p.includes('CBUQ') ||
      p.includes('FRESAGEM') || p.includes('RECAPEAMENTO') || p.includes('BASE') ||
      p.includes('SUB-BASE') || p.includes('IMPRIMACAO')) {
    return 'PAVIMENTACAO';
  }
  
  // Sinalização
  if (p.includes('SINALIZ') || p.includes('PLACA') || p.includes('PINTURA DE FAIXA') ||
      p.includes('DEMARCACAO') || p.includes('DEFENSA') || p.includes('NEW JERSEY') ||
      p.includes('GUARD RAIL')) {
    return 'SINALIZACAO';
  }
  
  // Estrutura / Concreto
  if (p.includes('CONCRET') || p.includes('FUNDAC') || p.includes('FORMA') || 
      p.includes('ARMAD') || p.includes('ESTRUTURA') || p.includes('PILAR') ||
      p.includes('VIGA') || p.includes('LAJE') || p.includes('ESTACA') ||
      p.includes('SAPATA') || p.includes('BLOCO')) {
    return 'ESTRUTURA';
  }
  
  // Paisagismo
  if (p.includes('PAISAG') || p.includes('JARDIM') || p.includes('GRAMA') ||
      p.includes('PLANTIO') || p.includes('ARVORE') || p.includes('VEGETAC')) {
    return 'PAISAGISMO';
  }
  
  // Obras de Arte
  if (p.includes('PONTE') || p.includes('VIADUTO') || p.includes('PASSARELA') ||
      p.includes('TUNEL') || p.includes('GALERIA') || p.includes('OAE') ||
      p.includes('OBRAS DE ARTE')) {
    return 'OBRAS_ARTE_ESPECIAIS';
  }
  
  // Elétrica / Iluminação
  if (p.includes('ELETRI') || p.includes('ILUMINAC') || p.includes('POSTE') ||
      p.includes('CABO') || p.includes('QUADRO')) {
    return 'INSTALACOES_ELETRICAS';
  }
  
  // Limpeza
  if (p.includes('LIMPEZA') || p.includes('ROCADA') || p.includes('CAPINA') ||
      p.includes('DESTOCA') || p.includes('DESMATAMENTO')) {
    return 'LIMPEZA';
  }
  
  // Manutenção
  if (p.includes('MANUTENC') || p.includes('CONSERV')) {
    return 'MANUTENCAO';
  }
  
  return '';
}

/**
 * Infere FRENTE a partir do caminho da pasta
 */
export function inferFrenteFromPath(folderPath?: string): string {
  const p = norm(folderPath);
  
  // FREE FLOW (P01-P25)
  const ffMatch = p.match(/FREE[_\s-]?FLOW[_\s-]?(P\d{1,2}|NORTE|SUL|LESTE|OESTE)/i);
  if (ffMatch) {
    const suffix = ffMatch[1].toUpperCase();
    if (suffix.startsWith('P')) {
      return `FREE_FLOW_P${suffix.slice(1).padStart(2, '0')}`;
    }
    return `FREE_FLOW_${suffix}`;
  }
  
  // BSO (Base de Serviço Operacional)
  const bsoMatch = p.match(/BSO[_\s-]?(0?\d{1,2}|NORTE|SUL|LESTE|OESTE|CENTRAL)/i);
  if (bsoMatch) {
    const suffix = bsoMatch[1].toUpperCase();
    if (/^\d+$/.test(suffix)) {
      return `BSO_${suffix.padStart(2, '0')}`;
    }
    return `BSO_${suffix}`;
  }
  
  // PRAÇA (Praça de Pedágio)
  const pracaMatch = p.match(/PRACA[_\s-]?(0?\d{1,2}|PEDAGIO|NORTE|SUL|CENTRAL)/i);
  if (pracaMatch) {
    const suffix = pracaMatch[1].toUpperCase();
    if (/^\d+$/.test(suffix)) {
      return `PRACA_${suffix.padStart(2, '0')}`;
    }
    return `PRACA_${suffix}`;
  }
  
  // TRECHO / LOTE
  const trechoMatch = p.match(/(?:TRECHO|LOTE)[_\s-]?(0?\d{1,2}|[A-E])/i);
  if (trechoMatch) {
    const suffix = trechoMatch[1].toUpperCase();
    if (/^\d+$/.test(suffix)) {
      return `TRECHO_${suffix.padStart(2, '0')}`;
    }
    return `LOTE_${suffix}`;
  }
  
  // KM (Quilometragem)
  const kmMatch = p.match(/KM[_\s-]?(\d{1,3})[_\s-]?(?:A|AO?)?[_\s-]?(\d{1,3})?/i);
  if (kmMatch) {
    const km1 = kmMatch[1].padStart(3, '0');
    const km2 = kmMatch[2] ? kmMatch[2].padStart(3, '0') : null;
    return km2 ? `KM_${km1}_${km2}` : `KM_${km1}`;
  }
  
  return '';
}

/**
 * Mapeamento de SERVIÇO para DISCIPLINA
 * Quando temos o serviço mas não a disciplina
 */
export const SERVICE_TO_DISCIPLINA: Record<string, string> = {
  // Terraplanagem
  'LIMPEZA_DE_TERRENO': 'TERRAPLANAGEM',
  'LIMPEZA_TERRENO': 'TERRAPLANAGEM',
  'ROÇADA_MANUAL': 'TERRAPLANAGEM',
  'ROÇADA_MECANIZADA': 'TERRAPLANAGEM',
  'ROCADA_MECANIZADA': 'TERRAPLANAGEM',
  'ROCADA': 'TERRAPLANAGEM',
  'DESTOCAMENTO': 'TERRAPLANAGEM',
  'DESTOCA': 'TERRAPLANAGEM',
  'ESCAVAÇÃO_MANUAL': 'TERRAPLANAGEM',
  'ESCAVAÇÃO_MECANIZADA': 'TERRAPLANAGEM',
  'ESCAVACAO_MECANICA': 'TERRAPLANAGEM',
  'ATERRO': 'TERRAPLANAGEM',
  'REATERRO': 'TERRAPLANAGEM',
  'COMPACTAÇÃO_DE_SOLO': 'TERRAPLANAGEM',
  'COMPACTACAO_SOLO': 'TERRAPLANAGEM',
  'REGULARIZAÇÃO_DO_SUBLEITO': 'TERRAPLANAGEM',
  'REGULARIZACAO_SUBLEITO': 'TERRAPLANAGEM',
  'CORTE_SOLO': 'TERRAPLANAGEM',
  'BOTA_FORA': 'TERRAPLANAGEM',
  
  // Drenagem
  'ESCAVAÇÃO_DE_VALAS': 'DRENAGEM',
  'ESCAVACAO_DE_VALETA': 'DRENAGEM',
  'ASSENTAMENTO_DE_TUBOS': 'DRENAGEM',
  'TUBULAÇÃO_DE_CONCRETO': 'DRENAGEM',
  'TUBULAÇÃO_DE_PVC': 'DRENAGEM',
  'CAIXA_DE_PASSAGEM': 'DRENAGEM',
  'POÇO_DE_VISITA': 'DRENAGEM',
  'POCO_VISITA': 'DRENAGEM',
  'BUEIRO_CELULAR': 'DRENAGEM',
  'BUEIRO_TUBULAR': 'DRENAGEM',
  'SARJETA': 'DRENAGEM',
  'SARJETÃO': 'DRENAGEM',
  'SARJETA_CONCRETO': 'DRENAGEM',
  'CANALETA': 'DRENAGEM',
  'DRENO_LONGITUDINAL': 'DRENAGEM',
  'DRENO_TRANSVERSAL': 'DRENAGEM',
  'DRENO_PROFUNDO': 'DRENAGEM',
  'DRENO_FRANCES': 'DRENAGEM',
  'LIMPEZA_DE_DRENAGEM': 'DRENAGEM',
  'LIMPEZA_E_CONFORMACAO_DE_VALETA': 'DRENAGEM',
  'LIMPEZA_SARJETA': 'DRENAGEM',
  'LIMPEZA_BUEIRO': 'DRENAGEM',
  'BOCA_DE_LOBO': 'DRENAGEM',
  'BOCA_LOBO': 'DRENAGEM',
  'DESCIDA_DAGUA': 'DRENAGEM',
  'DESCIDA_AGUA': 'DRENAGEM',
  
  // Pavimentação
  'IMPRIMAÇÃO': 'PAVIMENTACAO',
  'IMPRIMACAO': 'PAVIMENTACAO',
  'IMPRIMACAO_ASFALTICA': 'PAVIMENTACAO',
  'PINTURA_DE_LIGAÇÃO': 'PAVIMENTACAO',
  'BASE_GRANULAR': 'PAVIMENTACAO',
  'SUB_BASE': 'PAVIMENTACAO',
  'BGS': 'PAVIMENTACAO',
  'BRITA_CORRIDA': 'PAVIMENTACAO',
  'BRITA_GRADUADA': 'PAVIMENTACAO',
  'EXECUÇÃO_DE_CBUQ': 'PAVIMENTACAO',
  'CBUQ_BINDER': 'PAVIMENTACAO',
  'CBUQ_ROLAMENTO': 'PAVIMENTACAO',
  'MICROREVESTIMENTO': 'PAVIMENTACAO',
  'MICRORREVESTIMENTO': 'PAVIMENTACAO',
  'FRESAGEM': 'PAVIMENTACAO',
  'FRESAGEM_ASFALTO': 'PAVIMENTACAO',
  'RECAPAGEM': 'PAVIMENTACAO',
  'RECAPEAMENTO': 'PAVIMENTACAO',
  'SELAGEM_DE_TRINCAS': 'PAVIMENTACAO',
  'SELAGEM_TRINCA': 'PAVIMENTACAO',
  'REMENDO_PROFUNDO': 'PAVIMENTACAO',
  'REMENDO_SUPERFICIAL': 'PAVIMENTACAO',
  'OPERACAO_TAPA_BURACO': 'PAVIMENTACAO',
  'TAPA_BURACO': 'PAVIMENTACAO',
  
  // Sinalização
  'SINALIZAÇÃO_HORIZONTAL': 'SINALIZACAO',
  'SINALIZACAO_HORIZONTAL': 'SINALIZACAO',
  'PINTURA_DE_FAIXAS': 'SINALIZACAO',
  'PINTURA_FAIXA': 'SINALIZACAO',
  'PINTURA_DE_EIXO': 'SINALIZACAO',
  'PINTURA_SETA': 'SINALIZACAO',
  'PINTURA_LEGENDA': 'SINALIZACAO',
  'PINTURA_ZEBRADO': 'SINALIZACAO',
  'TACHÃO': 'SINALIZACAO',
  'TACHAS_REFLETIVAS': 'SINALIZACAO',
  'PLACA_DE_SINALIZAÇÃO': 'SINALIZACAO',
  'PLACA_REGULAMENTACAO': 'SINALIZACAO',
  'PLACA_ADVERTENCIA': 'SINALIZACAO',
  'IMPLANTAÇÃO_DE_PLACAS': 'SINALIZACAO',
  'DEFENSA_METÁLICA': 'SINALIZACAO',
  'DEFENSA_METALICA': 'SINALIZACAO',
  'GUARD_RAIL': 'SINALIZACAO',
  'NEW_JERSEY_CONCRETO': 'SINALIZACAO',
  'NEW_JERSEY_PLASTICO': 'SINALIZACAO',
  'BALIZADOR': 'SINALIZACAO',
  
  // Estrutura
  'CONCRETAGEM': 'ESTRUTURA',
  'LANCAMENTO_CONCRETO': 'ESTRUTURA',
  'ARMAÇÃO_DE_AÇO': 'ESTRUTURA',
  'ARMACAO_ACO': 'ESTRUTURA',
  'FÔRMAS': 'ESTRUTURA',
  'FORMA_MADEIRA': 'ESTRUTURA',
  'FORMA_METALICA': 'ESTRUTURA',
  'SAPATA': 'ESTRUTURA',
  'SAPATA_CORRIDA': 'ESTRUTURA',
  'SAPATA_ISOLADA': 'ESTRUTURA',
  'BLOCO_DE_FUNDAÇÃO': 'ESTRUTURA',
  'BLOCO_FUNDACAO': 'ESTRUTURA',
  'ESTACA_ESCAVADA': 'ESTRUTURA',
  'ESTACA_HELICE_CONTINUA': 'ESTRUTURA',
  'ESTACA_RAIZ': 'ESTRUTURA',
  'ESTACA_BROCA': 'ESTRUTURA',
  'ESTACA_PRE_MOLDADA': 'ESTRUTURA',
  'RADIER': 'ESTRUTURA',
  'PILAR_CONCRETO': 'ESTRUTURA',
  'VIGA_CONCRETO': 'ESTRUTURA',
  'LAJE_MACICA': 'ESTRUTURA',
  'LAJE_NERVURADA': 'ESTRUTURA',
  
  // Paisagismo
  'PREPARO_DE_SOLO': 'PAISAGISMO',
  'PLANTIO_DE_GRAMA': 'PAISAGISMO',
  'PLANTIO_GRAMA': 'PAISAGISMO',
  'PLANTIO_DE_ARVORES': 'PAISAGISMO',
  'PLANTIO_ARVORES': 'PAISAGISMO',
  'JARDINAGEM': 'PAISAGISMO',
  'PODA': 'PAISAGISMO',
  'HIDROSSEMEADURA': 'PAISAGISMO',
  'ADUBACAO': 'PAISAGISMO',
  
  // Manutenção
  'MANUTENCAO_PREVENTIVA': 'MANUTENCAO',
  'MANUTENCAO_CORRETIVA': 'MANUTENCAO',
  'INSPECAO_VISUAL': 'MANUTENCAO',
  'VISTORIA_TECNICA': 'MANUTENCAO',
};

/**
 * Infere DISCIPLINA a partir do SERVIÇO
 */
export function inferDisciplinaFromServico(servico?: string): string {
  if (!servico) return '';
  
  const normalized = norm(servico).replace(/\s+/g, '_');
  
  // Busca direta no mapeamento
  const direct = SERVICE_TO_DISCIPLINA[normalized];
  if (direct) return direct;
  
  // Busca por substring
  for (const [key, value] of Object.entries(SERVICE_TO_DISCIPLINA)) {
    if (normalized.includes(norm(key).replace(/\s+/g, '_')) || 
        norm(key).replace(/\s+/g, '_').includes(normalized)) {
      return value;
    }
  }
  
  return '';
}

/**
 * Verifica se uma foto precisa de verificação manual
 * Regra OBJETIVA: só marca vermelho se faltar campo obrigatório
 */
export function needsManualReview(photo: {
  frente?: string;
  disciplina?: string;
  servico?: string;
  confidence?: number;
}): boolean {
  const semFrente = !photo.frente || 
    photo.frente === 'FRENTE_NAO_INFORMADA' ||
    photo.frente.includes('NAO_INFORMAD');
    
  const semDisciplina = !photo.disciplina || 
    photo.disciplina === 'DISCIPLINA_NAO_INFORMADA' ||
    photo.disciplina === 'DISCIPLINA_NAO_IDENTIFICADA' ||
    photo.disciplina.includes('NAO_INFORMAD') ||
    photo.disciplina.includes('NAO_IDENTIFICAD');
    
  const semServico = !photo.servico || 
    photo.servico === 'SERVICO_NAO_IDENTIFICADO' ||
    photo.servico === 'SERVICO_NAO_INFORMADO' ||
    photo.servico.includes('NAO_INFORMAD') ||
    photo.servico.includes('NAO_IDENTIFICAD');

  // Só marca para verificação se faltar disciplina OU serviço
  // Frente é menos crítico, confidence baixo também não é problema
  const camposObrigatoriosFaltando = semDisciplina || semServico;
  
  // Só marca vermelho se confidence for MUITO baixa (< 0.35)
  const confiancaMuitoBaixa = (photo.confidence ?? 1) < 0.35;
  
  return camposObrigatoriosFaltando || confiancaMuitoBaixa;
}

/**
 * Aplica fallbacks determinísticos para preencher campos faltantes
 */
export function applyFallbacks(photo: {
  frente?: string;
  disciplina?: string;
  servico?: string;
  folderPath?: string;
  filename?: string;
}): { frente: string; disciplina: string; servico: string } {
  let frente = photo.frente || '';
  let disciplina = photo.disciplina || '';
  let servico = photo.servico || '';
  
  // Fallback para FRENTE
  if (!frente || frente === 'FRENTE_NAO_INFORMADA' || frente.includes('NAO_INFORMAD')) {
    const inferredFrente = inferFrenteFromPath(photo.folderPath) || 
                           inferFrenteFromPath(photo.filename);
    if (inferredFrente) {
      frente = inferredFrente;
    } else {
      frente = 'FRENTE_NAO_INFORMADA';
    }
  }
  
  // Fallback para DISCIPLINA
  if (!disciplina || disciplina === 'DISCIPLINA_NAO_INFORMADA' || 
      disciplina === 'DISCIPLINA_NAO_IDENTIFICADA' || disciplina.includes('NAO_INFORMAD')) {
    // Tenta do path
    let inferred = inferDisciplinaFromPath(photo.folderPath);
    if (!inferred) {
      inferred = inferDisciplinaFromPath(photo.filename);
    }
    // Tenta do serviço
    if (!inferred && servico) {
      inferred = inferDisciplinaFromServico(servico);
    }
    disciplina = inferred || 'DISCIPLINA_NAO_INFORMADA';
  }
  
  // Fallback para SERVIÇO - não tem como inferir automaticamente
  if (!servico || servico === 'SERVICO_NAO_IDENTIFICADO' || servico.includes('NAO_IDENTIFICAD')) {
    servico = 'SERVICO_NAO_IDENTIFICADO';
  }
  
  return { frente, disciplina, servico };
}
