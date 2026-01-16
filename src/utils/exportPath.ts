/**
 * Utilitários para geração de caminhos de exportação
 * Estrutura: EMPRESA/FRENTE/CATEGORIA/SERVICO/YYYY-MM/DD/foto.jpg
 */

/**
 * Limpa segmento para uso em nome de pasta
 * Mantém acentos, remove apenas caracteres que quebram pasta/zip
 */
const safeSegment = (s: string, fallback: string = 'NAO_INFORMADO'): string => {
  const cleaned = (s || fallback)
    .trim()
    .replace(/[\\/:"*?<>|]+/g, ' ') // Proibidos em Windows
    .replace(/\s+/g, '_')
    .replace(/\.+$/g, '') // Não terminar com ponto
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  return cleaned.substring(0, 80) || fallback;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Calcula yearMonth e day a partir de dateIso ou lastModified
 */
export function computeYearMonthDay(dateIso?: string | null, lastModified?: Date | number): {
  yearMonth: string;
  day: string;
} {
  // Prioridade 1: dateIso (YYYY-MM-DD)
  if (dateIso && /^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    const [y, m, d] = dateIso.split('-');
    return { yearMonth: `${y}-${m}`, day: d };
  }

  // Prioridade 2: lastModified
  const dt = lastModified ? new Date(lastModified) : new Date();
  
  // Valida data
  if (isNaN(dt.getTime())) {
    const now = new Date();
    return {
      yearMonth: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`,
      day: pad2(now.getDate()),
    };
  }
  
  const y = dt.getFullYear();
  const m = pad2(dt.getMonth() + 1);
  const d = pad2(dt.getDate());
  
  return { yearMonth: `${y}-${m}`, day: d };
}

/**
 * Extrai data de EXIF (se disponível) ou File.lastModified
 */
export function extractDateFromFile(file: File): {
  dateIso: string;
  yearMonth: string;
  day: string;
} {
  // File.lastModified é sempre disponível
  const lastMod = file.lastModified;
  const { yearMonth, day } = computeYearMonthDay(null, lastMod);
  
  const dt = new Date(lastMod);
  const dateIso = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  
  return { dateIso, yearMonth, day };
}

/**
 * Heurística para inferir empresa do folderPath
 */
export function inferEmpresaFromFolder(folderPath?: string): string {
  if (!folderPath) return '';

  const up = folderPath.toUpperCase();
  
  // Ajuste conforme suas empresas reais
  if (up.includes('DER') || up.includes('DEPARTAMENTO')) return 'DER';
  if (up.includes('CCR')) return 'CCR';
  if (up.includes('SANSON')) return 'SANSON';
  if (up.includes('NUCLEO')) return 'NUCLEO';
  if (up.includes('ARTERIS')) return 'ARTERIS';
  if (up.includes('ECORODOVIAS')) return 'ECORODOVIAS';
  if (up.includes('TRIUNFO')) return 'TRIUNFO';
  if (up.includes('RODONORTE')) return 'RODONORTE';
  if (up.includes('ECOVIAS')) return 'ECOVIAS';
  if (up.includes('AUTOBAN')) return 'AUTOBAN';
  if (up.includes('VIARONDON')) return 'VIARONDON';
  if (up.includes('RENOVIAS')) return 'RENOVIAS';
  if (up.includes('INTERVIAS')) return 'INTERVIAS';
  if (up.includes('SPVIAS')) return 'SPVIAS';
  if (up.includes('VIAOESTE')) return 'VIAOESTE';
  if (up.includes('VIANORTE')) return 'VIANORTE';
  if (up.includes('RODOANEL')) return 'RODOANEL';
  if (up.includes('DERSA')) return 'DERSA';
  if (up.includes('DNIT')) return 'DNIT';
  
  return '';
}

export interface ExportPathInput {
  empresa?: string;
  frente?: string;
  categoria?: string; // No app: disciplina
  servico?: string;
  dateIso?: string | null;
  lastModified?: Date | number;
  filename: string;
}

/**
 * Monta caminho de exportação completo
 * Estrutura: EMPRESA/FRENTE/CATEGORIA/SERVICO/YYYY-MM/DD/filename
 */
export function buildExportPath(input: ExportPathInput): string {
  const { yearMonth, day } = computeYearMonthDay(input.dateIso, input.lastModified);

  const empresa = safeSegment(input.empresa || '', 'EMPRESA_NAO_INFORMADA');
  const frente = safeSegment(input.frente || '', 'FRENTE_NAO_INFORMADA');
  const categoria = safeSegment(input.categoria || '', 'CATEGORIA_NAO_INFORMADA');
  const servico = safeSegment(input.servico || '', 'SERVICO_NAO_IDENTIFICADO');
  const filename = safeSegment(input.filename, 'foto.jpg');

  return `${empresa}/${frente}/${categoria}/${servico}/${yearMonth}/${day}/${filename}`;
}

/**
 * Monta caminho de exportação simples (sem empresa)
 * Estrutura: FRENTE/DISCIPLINA/SERVICO/YYYY-MM/DD/filename
 */
export function buildSimpleExportPath(input: Omit<ExportPathInput, 'empresa'>): string {
  const { yearMonth, day } = computeYearMonthDay(input.dateIso, input.lastModified);

  const frente = safeSegment(input.frente || '', 'FRENTE_NAO_INFORMADA');
  const categoria = safeSegment(input.categoria || '', 'DISCIPLINA_NAO_INFORMADA');
  const servico = safeSegment(input.servico || '', 'SERVICO_NAO_IDENTIFICADO');
  const filename = safeSegment(input.filename, 'foto.jpg');

  return `${frente}/${categoria}/${servico}/${yearMonth}/${day}/${filename}`;
}
