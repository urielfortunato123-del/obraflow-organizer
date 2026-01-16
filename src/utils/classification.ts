/**
 * Sistema de classificação inteligente de fotos
 * Hierarquia de prioridade: folderPath > filename > OCR > IA
 */

import { extractFrenteFromPath, extractFrenteFromOCR } from './frente';
import { extractDateFromFile, computeYearMonthDay } from './exportPath';
import { applyAliasRules, normalizeForMatch } from './helpers';
import { DISCIPLINAS, SERVICOS } from '@/data/constructionTerms';
import type { PhotoData } from '@/types/photo';

// Conjuntos para busca rápida
const DISCIPLINAS_SET = new Set(DISCIPLINAS.map(d => normalizeForMatch(d)));
const SERVICOS_SET = new Set(SERVICOS.map(s => normalizeForMatch(s)));

export interface ClassificationResult {
  frente: string;
  disciplina: string;
  servico: string;
  dateIso: string | null;
  yearMonth: string | null;
  day: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  status: 'AUTO_OK' | 'REVISAR' | 'MANUAL';
  source: {
    frente: 'folder' | 'filename' | 'ocr' | 'ai' | 'none';
    disciplina: 'folder' | 'filename' | 'ocr' | 'alias' | 'ai' | 'none';
    servico: 'folder' | 'filename' | 'ocr' | 'alias' | 'ai' | 'none';
    date: 'exif' | 'lastModified' | 'ocr' | 'none';
  };
}

/**
 * Busca termo exato de disciplina no texto
 */
function findDisciplinaInText(text: string): string | null {
  const normalized = normalizeForMatch(text);
  const parts = normalized.split(/\s+/);
  
  // Busca por match exato de cada palavra
  for (const part of parts) {
    if (DISCIPLINAS_SET.has(part)) {
      // Retorna o termo original da lista
      return DISCIPLINAS.find(d => normalizeForMatch(d) === part) || part;
    }
  }
  
  // Busca por substrings
  for (const disciplina of DISCIPLINAS) {
    const normDisc = normalizeForMatch(disciplina);
    if (normalized.includes(normDisc) && normDisc.length >= 5) {
      return disciplina;
    }
  }
  
  return null;
}

/**
 * Busca termo exato de serviço no texto
 */
function findServicoInText(text: string): string | null {
  const normalized = normalizeForMatch(text);
  
  // Busca por match exato ou substring
  for (const servico of SERVICOS) {
    const normServ = normalizeForMatch(servico);
    // Para serviços, busca substring pois são compostos
    if (normalized.includes(normServ) && normServ.length >= 5) {
      return servico;
    }
  }
  
  return null;
}

/**
 * Classifica foto usando hierarquia de prioridade
 * 1. folderPath (mais confiável)
 * 2. filename
 * 3. OCR text (menos confiável)
 */
export function classifyPhoto(photo: {
  file: File;
  folderPath?: string;
  filename?: string;
  ocrText?: string;
  dateIso?: string | null;
  yearMonth?: string | null;
}): ClassificationResult {
  const result: ClassificationResult = {
    frente: 'FRENTE_NAO_INFORMADA',
    disciplina: 'DISCIPLINA_NAO_INFORMADA',
    servico: 'SERVICO_NAO_IDENTIFICADO',
    dateIso: null,
    yearMonth: null,
    day: null,
    confidence: 'none',
    status: 'MANUAL',
    source: {
      frente: 'none',
      disciplina: 'none',
      servico: 'none',
      date: 'none',
    },
  };

  // =====================================================
  // 1. DATA - Prioridade: EXIF > lastModified > OCR
  // =====================================================
  
  // Usa lastModified do arquivo (sempre disponível)
  if (photo.file) {
    const fileDate = extractDateFromFile(photo.file);
    result.dateIso = fileDate.dateIso;
    result.yearMonth = fileDate.yearMonth;
    result.day = fileDate.day;
    result.source.date = 'lastModified';
  }
  
  // Se já tem dateIso (do EXIF), usa ele
  if (photo.dateIso && photo.yearMonth) {
    result.dateIso = photo.dateIso;
    result.yearMonth = photo.yearMonth;
    const parts = photo.dateIso.split('-');
    result.day = parts[2] || null;
    result.source.date = 'exif';
  }

  // =====================================================
  // 2. FRENTE - Prioridade: folderPath > filename > OCR
  // =====================================================
  
  // Tenta extrair da pasta
  const frenteFromPath = extractFrenteFromPath(photo.folderPath, photo.filename);
  if (frenteFromPath !== 'FRENTE_NAO_INFORMADA') {
    result.frente = frenteFromPath;
    result.source.frente = 'folder';
  } else {
    // Tenta do OCR
    const frenteFromOCR = extractFrenteFromOCR(photo.ocrText);
    if (frenteFromOCR) {
      result.frente = frenteFromOCR;
      result.source.frente = 'ocr';
    }
  }

  // =====================================================
  // 3. DISCIPLINA - Prioridade: folderPath > filename > alias > OCR
  // =====================================================
  
  // Tenta match exato na pasta
  const discFromFolder = findDisciplinaInText(photo.folderPath || '');
  if (discFromFolder) {
    result.disciplina = discFromFolder;
    result.source.disciplina = 'folder';
  } else {
    // Tenta no filename
    const discFromFile = findDisciplinaInText(photo.filename || '');
    if (discFromFile) {
      result.disciplina = discFromFile;
      result.source.disciplina = 'filename';
    }
  }

  // =====================================================
  // 4. SERVIÇO - Prioridade: folderPath > filename > alias > OCR
  // =====================================================
  
  // Tenta match exato na pasta
  const servFromFolder = findServicoInText(photo.folderPath || '');
  if (servFromFolder) {
    result.servico = servFromFolder;
    result.source.servico = 'folder';
  } else {
    // Tenta no filename
    const servFromFile = findServicoInText(photo.filename || '');
    if (servFromFile) {
      result.servico = servFromFile;
      result.source.servico = 'filename';
    }
  }

  // =====================================================
  // 5. ALIAS RULES - Completa campos faltantes
  // =====================================================
  
  const aliasResult = applyAliasRules({
    folderPath: photo.folderPath,
    filename: photo.filename,
    ocrText: photo.ocrText,
  });

  if (aliasResult && aliasResult.score > 0) {
    // Só aplica se ainda não tiver
    if (result.disciplina === 'DISCIPLINA_NAO_INFORMADA' && aliasResult.disciplina) {
      result.disciplina = aliasResult.disciplina;
      result.source.disciplina = 'alias';
    }
    if (result.servico === 'SERVICO_NAO_IDENTIFICADO' && aliasResult.servico) {
      result.servico = aliasResult.servico;
      result.source.servico = 'alias';
    }
    if (result.frente === 'FRENTE_NAO_INFORMADA' && aliasResult.frente) {
      result.frente = aliasResult.frente;
      result.source.frente = 'folder'; // Alias veio da pasta
    }
  }

  // =====================================================
  // 6. OCR TEXT - Última tentativa para campos faltantes
  // =====================================================
  
  if (photo.ocrText) {
    if (result.disciplina === 'DISCIPLINA_NAO_INFORMADA') {
      const discFromOCR = findDisciplinaInText(photo.ocrText);
      if (discFromOCR) {
        result.disciplina = discFromOCR;
        result.source.disciplina = 'ocr';
      }
    }
    if (result.servico === 'SERVICO_NAO_IDENTIFICADO') {
      const servFromOCR = findServicoInText(photo.ocrText);
      if (servFromOCR) {
        result.servico = servFromOCR;
        result.source.servico = 'ocr';
      }
    }
  }

  // =====================================================
  // 7. DETERMINAR CONFIANÇA E STATUS
  // =====================================================
  
  const hasFrente = result.frente !== 'FRENTE_NAO_INFORMADA';
  const hasDisciplina = result.disciplina !== 'DISCIPLINA_NAO_INFORMADA';
  const hasServico = result.servico !== 'SERVICO_NAO_IDENTIFICADO';
  const hasDate = result.dateIso !== null;
  
  const filledCount = [hasFrente, hasDisciplina, hasServico, hasDate].filter(Boolean).length;
  
  // Regra objetiva de status
  if (hasFrente && hasDisciplina && hasServico && hasDate) {
    result.confidence = 'high';
    result.status = 'AUTO_OK';
  } else if (filledCount >= 3) {
    result.confidence = 'medium';
    result.status = 'AUTO_OK'; // 3 de 4 = OK automático
  } else if (filledCount >= 2) {
    result.confidence = 'low';
    result.status = 'REVISAR';
  } else {
    result.confidence = 'none';
    result.status = 'MANUAL';
  }

  return result;
}

/**
 * Verifica se foto precisa de revisão manual
 * Regra objetiva: só revisa se faltar campos MESMO
 */
export function needsReview(photo: {
  frente?: string;
  disciplina?: string;
  servico?: string;
  dateIso?: string | null;
}): boolean {
  const semFrente = !photo.frente || photo.frente === 'FRENTE_NAO_INFORMADA';
  const semDisc = !photo.disciplina || 
    photo.disciplina === 'DISCIPLINA_NAO_INFORMADA' ||
    photo.disciplina === 'DISCIPLINA_NAO_IDENTIFICADA';
  const semServ = !photo.servico || 
    photo.servico === 'SERVICO_NAO_IDENTIFICADO' ||
    photo.servico === 'SERVICO_NAO_INFORMADO';

  // Só revisa se faltar disciplina OU serviço
  // Frente faltando não é crítico, data vem do arquivo
  return semDisc || semServ;
}

/**
 * Propaga classificação pela pasta
 * Se 1 foto numa pasta foi classificada, as outras herdam
 */
export function propagateByFolder(photos: PhotoData[]): PhotoData[] {
  // Agrupa por pasta e encontra a "melhor" classificação
  const byFolder = new Map<string, {
    frente: string;
    disciplina: string;
    servico: string;
    score: number;
  }>();

  for (const p of photos) {
    const key = p.folderPath || '';
    if (!key) continue;

    // Calcula score da foto
    const score =
      (p.frente && p.frente !== 'FRENTE_NAO_INFORMADA' ? 10 : 0) +
      (p.disciplina && p.disciplina !== 'DISCIPLINA_NAO_INFORMADA' && p.disciplina !== 'DISCIPLINA_NAO_IDENTIFICADA' ? 10 : 0) +
      (p.servico && p.servico !== 'SERVICO_NAO_IDENTIFICADO' && p.servico !== 'SERVICO_NAO_INFORMADO' ? 10 : 0);

    const current = byFolder.get(key);
    const currentScore = current?.score ?? -1;

    if (score > currentScore) {
      byFolder.set(key, {
        frente: p.frente,
        disciplina: p.disciplina,
        servico: p.servico,
        score,
      });
    }
  }

  // Propaga classificação para fotos da mesma pasta
  return photos.map((p) => {
    const base = byFolder.get(p.folderPath || '');
    if (!base) return p;

    const needsFrente = !p.frente || p.frente === 'FRENTE_NAO_INFORMADA';
    const needsDisciplina = !p.disciplina || 
      p.disciplina === 'DISCIPLINA_NAO_INFORMADA' || 
      p.disciplina === 'DISCIPLINA_NAO_IDENTIFICADA';
    const needsServico = !p.servico || 
      p.servico === 'SERVICO_NAO_IDENTIFICADO' ||
      p.servico === 'SERVICO_NAO_INFORMADO';

    // Só propaga se o base tiver valor válido
    const newFrente = needsFrente && base.frente && base.frente !== 'FRENTE_NAO_INFORMADA'
      ? base.frente : p.frente;
    const newDisciplina = needsDisciplina && base.disciplina && 
      base.disciplina !== 'DISCIPLINA_NAO_INFORMADA' && base.disciplina !== 'DISCIPLINA_NAO_IDENTIFICADA'
      ? base.disciplina : p.disciplina;
    const newServico = needsServico && base.servico && 
      base.servico !== 'SERVICO_NAO_IDENTIFICADO' && base.servico !== 'SERVICO_NAO_INFORMADO'
      ? base.servico : p.servico;

    return {
      ...p,
      frente: newFrente,
      disciplina: newDisciplina,
      servico: newServico,
    };
  });
}

/**
 * Determina status final da foto
 */
export function determineStatus(photo: {
  frente?: string;
  disciplina?: string;
  servico?: string;
  dateIso?: string | null;
  aiConfidence?: number | null;
}): 'OK' | 'Pendente' {
  const hasFrente = photo.frente && photo.frente !== 'FRENTE_NAO_INFORMADA';
  const hasDisciplina = photo.disciplina && 
    photo.disciplina !== 'DISCIPLINA_NAO_INFORMADA' && 
    photo.disciplina !== 'DISCIPLINA_NAO_IDENTIFICADA';
  const hasServico = photo.servico && 
    photo.servico !== 'SERVICO_NAO_IDENTIFICADO' &&
    photo.servico !== 'SERVICO_NAO_INFORMADO';
  const hasDate = photo.dateIso !== null && photo.dateIso !== undefined;

  // AUTO_OK se tem 3+ campos ou se tem disciplina + serviço + data
  if ((hasDisciplina && hasServico && hasDate) || 
      (hasFrente && hasDisciplina && hasServico)) {
    return 'OK';
  }

  // Revisa se falta disciplina OU serviço
  if (!hasDisciplina || !hasServico) {
    return 'Pendente';
  }

  return 'OK';
}
