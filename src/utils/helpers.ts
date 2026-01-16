import { ALIAS_RULES, type AliasRule } from '@/data/aliases';

// ============================================
// SISTEMA DE ALIAS PARA CLASSIFICAÇÃO RÁPIDA
// ============================================

/**
 * Normaliza texto para comparação
 * - Uppercase
 * - Remove acentos
 * - Substitui _ e - por espaço
 * - Remove caracteres especiais
 */
export function normalizeForMatch(s?: string): string {
  return (s || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[_\-]+/g, ' ')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Aplica regras de alias para classificar foto
 * Retorna disciplina, serviço e frente baseado no folderPath, filename e ocrText
 */
export interface AliasMatchResult {
  frente?: string;
  disciplina?: string;
  servico?: string;
  score: number;
  matchedRule?: AliasRule;
}

export function applyAliasRules(input: {
  folderPath?: string;
  filename?: string;
  ocrText?: string;
}): AliasMatchResult | null {
  const folder = normalizeForMatch(input.folderPath);
  const filename = normalizeForMatch(input.filename);
  const ocr = normalizeForMatch(input.ocrText);
  const hay = `${folder} ${filename} ${ocr}`;

  let best: AliasMatchResult = { score: 0 };

  for (const rule of ALIAS_RULES) {
    const scoreBase = rule.prioridade ?? 50;
    
    // Verifica se TODOS os termos do match existem no texto
    const ok = rule.match.every((m) => {
      const normalizedM = normalizeForMatch(m);
      return hay.includes(normalizedM);
    });
    
    if (!ok) continue;

    // Bônus se match veio da pasta (mais confiável)
    let bonusFolder = 0;
    if (rule.match.some((m) => folder.includes(normalizeForMatch(m)))) {
      bonusFolder = 20;
    }
    
    // Bônus se match veio do filename
    let bonusFilename = 0;
    if (rule.match.some((m) => filename.includes(normalizeForMatch(m)))) {
      bonusFilename = 10;
    }
    
    // Bônus por número de termos matched (mais específico = melhor)
    const bonusTerms = rule.match.length * 5;

    const score = scoreBase + bonusFolder + bonusFilename + bonusTerms;

    if (score > best.score) {
      best = { 
        frente: rule.frente, 
        disciplina: rule.disciplina, 
        servico: rule.servico, 
        score,
        matchedRule: rule,
      };
    }
  }

  return best.score > 0 ? best : null;
}

/**
 * Classifica foto usando aliases
 * Retorna resultado com confiança
 */
export interface LocalClassificationResult {
  frente?: string;
  disciplina?: string;
  servico?: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  source: 'alias' | 'direct' | 'none';
  score: number;
}

export function classifyWithAliases(input: {
  folderPath?: string;
  filename?: string;
  ocrText?: string;
}): LocalClassificationResult {
  const aliasResult = applyAliasRules(input);
  
  if (!aliasResult || aliasResult.score === 0) {
    return { confidence: 'none', source: 'none', score: 0 };
  }
  
  // Conta quantos campos foram preenchidos
  const filled = [
    aliasResult.frente,
    aliasResult.disciplina,
    aliasResult.servico,
  ].filter(Boolean).length;
  
  // Determina confiança baseado em:
  // - Quantos campos foram preenchidos
  // - Score total
  let confidence: 'high' | 'medium' | 'low' | 'none';
  
  if (filled >= 2 && aliasResult.score >= 80) {
    confidence = 'high';
  } else if (filled >= 2 || (filled === 1 && aliasResult.score >= 70)) {
    confidence = 'medium';
  } else if (filled >= 1) {
    confidence = 'low';
  } else {
    confidence = 'none';
  }
  
  return {
    frente: aliasResult.frente,
    disciplina: aliasResult.disciplina,
    servico: aliasResult.servico,
    confidence,
    source: 'alias',
    score: aliasResult.score,
  };
}

// ============================================
// FUNÇÕES UTILITÁRIAS EXISTENTES
// ============================================

/**
 * Normaliza nome para uso em pastas (remove acentos, espaços, caracteres especiais)
 */
export function normalizeName(name: string, maxLength: number = 60): string {
  if (!name || name.trim() === '') {
    return 'SEM_NOME';
  }

  // Remove acentos
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Substitui espaços por underscore e remove caracteres inválidos
  const cleaned = normalized
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  // Limita tamanho
  return cleaned.substring(0, maxLength) || 'SEM_NOME';
}

/**
 * Mapeamento de meses em português
 */
const MONTHS_PT: Record<string, string> = {
  'jan': '01', 'janeiro': '01',
  'fev': '02', 'fevereiro': '02',
  'mar': '03', 'março': '03', 'marco': '03',
  'abr': '04', 'abril': '04',
  'mai': '05', 'maio': '05',
  'jun': '06', 'junho': '06',
  'jul': '07', 'julho': '07',
  'ago': '08', 'agosto': '08',
  'set': '09', 'setembro': '09',
  'out': '10', 'outubro': '10',
  'nov': '11', 'novembro': '11',
  'dez': '12', 'dezembro': '12',
};

/**
 * Extrai data do texto OCR
 * Aceita formatos:
 * - "26 de ago. de 2025"
 * - "27 de agosto de 2025"
 * - "26/08/2025"
 * - "2025-08-26"
 */
export function extractDateFromText(text: string): { dateIso: string | null; yearMonth: string | null } {
  if (!text) return { dateIso: null, yearMonth: null };

  const textLower = text.toLowerCase();

  // Padrão: "26 de ago. de 2025" ou "27 de agosto de 2025"
  const ptBrPattern = /(\d{1,2})\s*de\s*([a-záéíóúç]+)\.?\s*de\s*(\d{4})/gi;
  let match = ptBrPattern.exec(textLower);
  
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthStr = match[2].replace('.', '').toLowerCase();
    const year = match[3];
    
    // Procura o mês
    for (const [key, value] of Object.entries(MONTHS_PT)) {
      if (monthStr.startsWith(key)) {
        const dateIso = `${year}-${value}-${day}`;
        const yearMonth = `${year}-${value}`;
        return { dateIso, yearMonth };
      }
    }
  }

  // Padrão: "26/08/2025"
  const slashPattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
  match = slashPattern.exec(text);
  
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    const dateIso = `${year}-${month}-${day}`;
    const yearMonth = `${year}-${month}`;
    return { dateIso, yearMonth };
  }

  // Padrão: "2025-08-26" (ISO)
  const isoPattern = /(\d{4})-(\d{2})-(\d{2})/;
  match = isoPattern.exec(text);
  
  if (match) {
    const dateIso = match[0];
    const yearMonth = `${match[1]}-${match[2]}`;
    return { dateIso, yearMonth };
  }

  return { dateIso: null, yearMonth: null };
}

/**
 * Extrai coordenadas GPS do texto OCR
 * Aceita formatos:
 * - "23.5109591S 47.5655273W"
 * - "23.510959S 47.565527W"
 * - "-23.510959, -47.565527"
 */
export function extractCoordinatesFromText(text: string): { latitude: number | null; longitude: number | null } {
  if (!text) return { latitude: null, longitude: null };

  // Padrão: "23.5109591S 47.5655273W"
  const coordPattern = /(\d+\.?\d*)\s*([NS])\s+(\d+\.?\d*)\s*([EWO])/gi;
  let match = coordPattern.exec(text);
  
  if (match) {
    let lat = parseFloat(match[1]);
    let lng = parseFloat(match[3]);
    
    // S e W são negativos
    if (match[2].toUpperCase() === 'S') lat = -lat;
    if (match[4].toUpperCase() === 'W' || match[4].toUpperCase() === 'O') lng = -lng;
    
    return { latitude: lat, longitude: lng };
  }

  // Padrão decimal: "-23.510959, -47.565527"
  const decimalPattern = /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/;
  match = decimalPattern.exec(text);
  
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    
    // Validação básica de coordenadas
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  return { latitude: null, longitude: null };
}

/**
 * Formata data para exibição
 */
export function formatDate(dateIso: string | null): string {
  if (!dateIso) return 'Não detectada';
  
  try {
    const date = new Date(dateIso + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateIso;
  }
}

/**
 * Gera ID único
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Trunca texto mantendo palavras completas
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text || text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
}

/**
 * Extrai preview do texto OCR
 * Remove linhas vazias e formata para exibição
 */
export function getOCRPreview(text: string | undefined, maxLines: number = 3): string {
  if (!text || text.trim() === '') return '';
  
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (lines.length === 0) return '';
  
  const preview = lines.slice(0, maxLines).join(' • ');
  
  if (lines.length > maxLines) {
    return preview + ` (+${lines.length - maxLines} linhas)`;
  }
  
  return preview;
}

/**
 * Verifica se está online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Formata timestamp para nome de arquivo
 */
export function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString()
    .replace(/[-:T]/g, '')
    .substring(0, 13);
}

/**
 * Extrai local e serviço do texto OCR
 * Formato esperado: "DATA HORA • LOCAL SERVICO"
 * Ex: "31/08/2025 10:27 • Free Flow P-09 Execução de limpeza"
 */
export function parseOCRForLocalServico(ocrText: string | undefined): { local: string | null; servico: string | null } {
  if (!ocrText || ocrText.trim() === '') {
    return { local: null, servico: null };
  }

  // Procura pelo padrão com bullet point (•)
  const bulletMatch = ocrText.match(/•\s*(.+)/);
  if (bulletMatch) {
    const afterBullet = bulletMatch[1].trim();
    return parseLocalServico(afterBullet);
  }

  // Se não tem bullet, tenta extrair após a data/hora
  // Padrão: "DD/MM/YYYY HH:MM texto..."
  const dateTimeMatch = ocrText.match(/\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}\s*(.+)/);
  if (dateTimeMatch) {
    return parseLocalServico(dateTimeMatch[1].trim());
  }

  // Tenta sem hora: "DD/MM/YYYY texto..."
  const dateOnlyMatch = ocrText.match(/\d{1,2}\/\d{1,2}\/\d{4}\s+(.+)/);
  if (dateOnlyMatch) {
    return parseLocalServico(dateOnlyMatch[1].trim());
  }

  // Se não encontrou padrão, usa o texto todo como possível entrada
  return parseLocalServico(ocrText.trim());
}

/**
 * Separa string em local e serviço
 * Heurísticas:
 * - Códigos como "P-09", "BR-101" fazem parte do local
 * - Palavras de ação indicam início do serviço: Execução, Manutenção, Limpeza, etc.
 */
function parseLocalServico(text: string): { local: string | null; servico: string | null } {
  if (!text || text.length < 3) {
    return { local: null, servico: null };
  }

  // Palavras-chave que indicam início do serviço
  const servicoKeywords = [
    'execução', 'execucao', 'manutenção', 'manutencao', 'limpeza', 'inspeção', 'inspecao',
    'reparo', 'instalação', 'instalacao', 'troca', 'substituição', 'substituicao',
    'verificação', 'verificacao', 'teste', 'medição', 'medicao', 'corte', 'poda',
    'roçada', 'rocada', 'capina', 'pintura', 'sinalização', 'sinalizacao',
    'pavimentação', 'pavimentacao', 'drenagem', 'terraplanagem', 'escavação', 'escavacao',
    'concretagem', 'armação', 'armacao', 'forma', 'demolição', 'demolicao',
    'recuperação', 'recuperacao', 'restauração', 'restauracao', 'reforço', 'reforco',
    'vistoria', 'fiscalização', 'fiscalizacao', 'levantamento', 'cadastro',
    'serviço', 'servico', 'atividade', 'operação', 'operacao', 'obra'
  ];

  const textLower = text.toLowerCase();
  
  // Procura pela primeira palavra-chave de serviço
  let servicoStart = -1;
  let foundKeyword = '';
  
  for (const keyword of servicoKeywords) {
    const idx = textLower.indexOf(keyword);
    if (idx !== -1 && (servicoStart === -1 || idx < servicoStart)) {
      servicoStart = idx;
      foundKeyword = keyword;
    }
  }

  if (servicoStart > 0) {
    // Encontrou palavra-chave de serviço
    const local = text.substring(0, servicoStart).trim();
    const servico = text.substring(servicoStart).trim();
    
    if (local.length > 0 && servico.length > 0) {
      return { local, servico };
    }
  }

  // Fallback: Tenta dividir por padrões de código (P-XX, KM XX, etc.)
  const codeMatch = text.match(/^(.+?(?:P-\d+|KM\s*\d+|BR-\d+|SP-\d+|[A-Z]{2,3}-\d+))\s+(.+)$/i);
  if (codeMatch) {
    return { local: codeMatch[1].trim(), servico: codeMatch[2].trim() };
  }

  // Último fallback: divide pela metade aproximadamente
  const words = text.split(/\s+/);
  if (words.length >= 2) {
    const midPoint = Math.ceil(words.length / 2);
    const local = words.slice(0, midPoint).join(' ');
    const servico = words.slice(midPoint).join(' ');
    return { local, servico };
  }

  return { local: text, servico: null };
}

// ============================================
// ORDENAÇÃO DE FOTOS PARA VISUALIZAÇÃO
// ============================================

/**
 * Ordena fotos para visualização na UI
 * Ordem: EMPRESA > FRENTE (P01..P25 numérico) > DISCIPLINA > SERVIÇO > DATA > NOME
 */
export function sortPhotosForView<T extends {
  folderPath?: string;
  empresa?: string;
  frente?: string;
  disciplina?: string;
  servico?: string;
  dateIso?: string | null;
  name?: string;
  filename?: string;
}>(photos: T[]): T[] {
  const norm = (s?: string | null) =>
    (s || '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const inferEmpresa = (p: T): string => {
    const a = norm(p.empresa);
    if (a) return a;
    const fp = norm(p.folderPath);
    if (fp.includes('DER') || fp.includes('DR')) return 'DER';
    if (fp.includes('CCR')) return 'CCR';
    if (fp.includes('SANSON')) return 'SANSON';
    if (fp.includes('NUCLEO')) return 'NUCLEO';
    return 'EMPRESA_NAO_INFORMADA';
  };

  const parseFrenteNum = (fr?: string): number => {
    const m = norm(fr).match(/P(\d{1,2})\b/);
    return m ? Number(m[1]) : 999;
  };

  return [...photos].sort((a, b) => {
    // 1. Empresa
    const ea = inferEmpresa(a);
    const eb = inferEmpresa(b);
    if (ea !== eb) return ea.localeCompare(eb);

    // 2. Frente (P01..P25 ordenado numericamente, depois alfabético)
    const fa = norm(a.frente);
    const fb = norm(b.frente);
    const na = parseFrenteNum(fa);
    const nb = parseFrenteNum(fb);
    if (na !== nb) return na - nb;
    if (fa !== fb) return fa.localeCompare(fb);

    // 3. Disciplina
    const ca = norm(a.disciplina);
    const cb = norm(b.disciplina);
    if (ca !== cb) return ca.localeCompare(cb);

    // 4. Serviço
    const sa = norm(a.servico);
    const sb = norm(b.servico);
    if (sa !== sb) return sa.localeCompare(sb);

    // 5. Data
    const da = a.dateIso || '';
    const db = b.dateIso || '';
    if (da !== db) return da.localeCompare(db);

    // 6. Nome do arquivo
    const faName = a.filename || a.name || '';
    const fbName = b.filename || b.name || '';
    return faName.localeCompare(fbName);
  });
}
