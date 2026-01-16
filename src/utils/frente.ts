/**
 * Extração de FRENTE pela pasta/filename - rápido e certeiro
 * Prioridade: folderPath > filename > OCR
 */

const normalize = (s?: string) =>
  (s || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Extrai frente do caminho da pasta
 * Suporta: FREE FLOW P-XX, BSO-XX, PRACA-XX, KM XXX-XXX, LOTE X, TRECHO XX, etc.
 */
export function extractFrenteFromPath(folderPath?: string, filename?: string): string {
  const pathTxt = normalize(folderPath);
  const fileTxt = normalize(filename);
  const txt = `${pathTxt} ${fileTxt}`;

  // FREE FLOW (P01..P99) - vários formatos
  const ff1 = txt.match(/FREE\s*FLOW\s*P\s*(\d{1,2})/);
  if (ff1) return `FREE_FLOW_P${ff1[1].padStart(2, '0')}`;

  // FREE FLOW com hífen ou underscore: P-09, P_09
  const ff2 = txt.match(/FREE\s*FLOW.*?P[\-_\s]?(\d{1,2})/);
  if (ff2) return `FREE_FLOW_P${ff2[1].padStart(2, '0')}`;

  // FREE FLOW direções
  if (txt.includes('FREE FLOW') && txt.includes('NORTE')) return 'FREE_FLOW_NORTE';
  if (txt.includes('FREE FLOW') && txt.includes('SUL')) return 'FREE_FLOW_SUL';
  if (txt.includes('FREE FLOW') && txt.includes('LESTE')) return 'FREE_FLOW_LESTE';
  if (txt.includes('FREE FLOW') && txt.includes('OESTE')) return 'FREE_FLOW_OESTE';

  // P simples em contexto FREE FLOW
  if (txt.includes('FREE') || txt.includes('FLOW')) {
    const p = txt.match(/\bP[\-_\s]?(\d{1,2})\b/);
    if (p) return `FREE_FLOW_P${p[1].padStart(2, '0')}`;
  }

  // BSO (Base de Serviço Operacional)
  const bso1 = txt.match(/\bBSO[\-_\s]?(\d{1,2})\b/);
  if (bso1) return `BSO_${bso1[1].padStart(2, '0')}`;
  
  // BSO direções
  if (txt.includes('BSO')) {
    if (txt.includes('NORTE')) return 'BSO_NORTE';
    if (txt.includes('SUL')) return 'BSO_SUL';
    if (txt.includes('LESTE')) return 'BSO_LESTE';
    if (txt.includes('OESTE')) return 'BSO_OESTE';
    if (txt.includes('CENTRAL')) return 'BSO_CENTRAL';
  }

  // PRAÇA de pedágio
  const praca = txt.match(/\bPRACA[\-_\s]?(\d{1,2})\b/);
  if (praca) return `PRACA_${praca[1].padStart(2, '0')}`;
  
  if (txt.includes('PRACA')) {
    if (txt.includes('PEDAGIO') && txt.includes('CENTRAL')) return 'PRACA_PEDAGIO_CENTRAL';
    if (txt.includes('PEDAGIO') && txt.includes('NORTE')) return 'PRACA_PEDAGIO_NORTE';
    if (txt.includes('PEDAGIO') && txt.includes('SUL')) return 'PRACA_PEDAGIO_SUL';
    if (txt.includes('PEDAGIO')) return 'PRACA_PEDAGIO_CENTRAL';
  }

  // LOTE
  const loteNum = txt.match(/\bLOTE[\-_\s]?(\d{1,2})\b/);
  if (loteNum) return `LOTE_${loteNum[1].padStart(2, '0')}`;
  
  const loteLetra = txt.match(/\bLOTE[\-_\s]?([A-E])\b/);
  if (loteLetra) return `LOTE_${loteLetra[1]}`;

  // TRECHO
  const trecho = txt.match(/\bTRECHO[\-_\s]?(\d{1,2})\b/);
  if (trecho) return `TRECHO_${trecho[1].padStart(2, '0')}`;

  // KM (quilometragem)
  const km1 = txt.match(/\bKM[\-_\s]?(\d{1,3})[\-_\s]+(\d{1,3})\b/);
  if (km1) return `KM_${km1[1].padStart(3, '0')}_${km1[2].padStart(3, '0')}`;
  
  const km2 = txt.match(/\bKM[\-_\s]?(\d{1,3})\b/);
  if (km2) return `KM_${km2[1].padStart(3, '0')}`;

  // ESTACA
  const estaca = txt.match(/\bESTACA[\-_\s]?(\d{1,4})\b/);
  if (estaca) return `ESTACA_${estaca[1]}`;

  // CANTEIRO
  if (txt.includes('CANTEIRO')) {
    if (txt.includes('CENTRAL')) return 'CANTEIRO_CENTRAL';
    if (txt.includes('APOIO')) return 'CANTEIRO_APOIO';
    const cantNum = txt.match(/CANTEIRO[\-_\s]?(\d{1,2})/);
    if (cantNum) return `CANTEIRO_${cantNum[1].padStart(2, '0')}`;
    return 'CANTEIRO_OBRAS';
  }

  // PONTE, VIADUTO, PASSARELA
  const ponte = txt.match(/\bPONTE[\-_\s]?(\d{1,2})\b/);
  if (ponte) return `PONTE_${ponte[1].padStart(2, '0')}`;
  
  const viaduto = txt.match(/\bVIADUTO[\-_\s]?(\d{1,2})\b/);
  if (viaduto) return `VIADUTO_${viaduto[1].padStart(2, '0')}`;

  // FAIXA / PISTA
  if (txt.includes('PISTA NORTE') || txt.includes('SENTIDO NORTE')) return 'PISTA_NORTE';
  if (txt.includes('PISTA SUL') || txt.includes('SENTIDO SUL')) return 'PISTA_SUL';
  if (txt.includes('SENTIDO CAPITAL')) return 'SENTIDO_CAPITAL';
  if (txt.includes('SENTIDO INTERIOR')) return 'SENTIDO_INTERIOR';

  // Se não achou nenhum padrão
  return 'FRENTE_NAO_INFORMADA';
}

/**
 * Extrai frente do texto OCR (última prioridade)
 */
export function extractFrenteFromOCR(ocrText?: string): string | null {
  if (!ocrText) return null;
  
  const frente = extractFrenteFromPath(ocrText);
  return frente !== 'FRENTE_NAO_INFORMADA' ? frente : null;
}
