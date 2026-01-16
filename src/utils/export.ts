import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { PhotoData, ClassificationMode } from '@/types/photo';
import { FOLDER_ROUTINE, FOLDER_UNIDENTIFIED } from '@/types/photo';
import { normalizeName, formatTimestamp } from './helpers';
import { buildSimpleExportPath, computeYearMonthDay } from './exportPath';

// ============================================================================
// REGRAS OFICIAIS DE EXPORTAÇÃO (ANTI-NULL)
// ============================================================================
// Regra Zero: Nunca criar pasta null, undefined ou vazia
// Regra 1: Classificação normal → FRENTE/DISCIPLINA/SERVICO/AAAA-MM/DD/foto.jpg
// Regra 2: Foto de rotina (data+local, sem categoria) → FOTO_DE_ROTINA/AAAA-MM/DD/foto.jpg
// Regra 3: Foto sem identificação → FOTOS_SEM_IDENTIFICACAO/AAAA-MM/DD/foto.jpg
// Regra 4: Fallback final (sem data) → FOTOS_SEM_IDENTIFICACAO/SEM_DATA/foto.jpg
// ============================================================================

/**
 * Sanitiza um valor string - NUNCA retorna null/undefined/vazio
 */
function sanitize(value: string | null | undefined, fallback: string): string {
  if (value === null || value === undefined) return fallback;
  const trimmed = String(value).trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return fallback;
  }
  return trimmed;
}

/**
 * Verifica se a classificação está completa (frente + disciplina + servico válidos)
 */
function isCompleteClassification(photo: PhotoData): boolean {
  const frente = sanitize(photo.frente, '');
  const disciplina = sanitize(photo.disciplina, '');
  const servico = sanitize(photo.servico, '');
  
  // Lista de valores inválidos
  const invalidValues = [
    '', 'NAO_INFORMADO', 'FRENTE_NAO_INFORMADA', 
    'DISCIPLINA_NAO_INFORMADA', 'SERVICO_NAO_INFORMADO',
    'SERVICO_NAO_IDENTIFICADO', 'SEM_DISCIPLINA', 'SEM_SERVICO'
  ];
  
  return !invalidValues.includes(frente.toUpperCase()) &&
         !invalidValues.includes(disciplina.toUpperCase()) &&
         !invalidValues.includes(servico.toUpperCase());
}

/**
 * Verifica se a foto tem indício de localização (KM, estaca, GPS, etc)
 */
function hasLocationHint(photo: PhotoData): boolean {
  const text = [
    photo.ocrText || '',
    photo.filename || '',
    photo.folderPath || '',
    photo.locationHint || ''
  ].join(' ').toUpperCase();
  
  // Padrões que indicam localização
  const locationPatterns = [
    /KM[_\s]?\d+/,           // KM_070, KM 80
    /ESTACA[_\s]?\d+/,       // ESTACA_120
    /SENTIDO/,               // SENTIDO NORTE
    /GPS/,                   // GPS
    /LAT[ITUDE]?/,           // LAT, LATITUDE
    /LONG[ITUDE]?/,          // LONG, LONGITUDE
    /FREE_?FLOW/,            // FREE_FLOW
    /BSO[_\s]?\d+/,          // BSO_01
    /PRACA[_\s]?\d+/,        // PRACA_01
    /TRECHO/,                // TRECHO
    /PISTA/,                 // PISTA
  ];
  
  return locationPatterns.some(pattern => pattern.test(text));
}

/**
 * Extrai data (yearMonth e day) da foto, com fallback para lastModified
 */
function extractDateFolder(photo: PhotoData): { yearMonth: string; day: string } {
  // Tenta usar dateIso primeiro
  if (photo.dateIso && /^\d{4}-\d{2}-\d{2}$/.test(photo.dateIso)) {
    const yearMonth = photo.dateIso.substring(0, 7); // YYYY-MM
    const day = photo.dateIso.substring(8, 10);       // DD
    return { yearMonth, day };
  }
  
  // Tenta usar yearMonth
  if (photo.yearMonth && /^\d{4}-\d{2}$/.test(photo.yearMonth)) {
    return { yearMonth: photo.yearMonth, day: photo.day || 'SEM_DIA' };
  }
  
  // Fallback para lastModified do arquivo
  if (photo.file?.lastModified) {
    const { yearMonth, day } = computeYearMonthDay(null, photo.file.lastModified);
    return { yearMonth, day };
  }
  
  // Fallback final
  return { yearMonth: 'SEM_DATA', day: 'SEM_DIA' };
}

/**
 * Decide a pasta principal da foto baseado nas regras oficiais
 */
function decideMainFolder(photo: PhotoData): ClassificationMode {
  // Verifica mode explícito definido pela IA
  if (photo.classificationMode === 'ROUTINE') return 'ROUTINE';
  if (photo.classificationMode === 'UNIDENTIFIED') return 'UNIDENTIFIED';
  
  // AUTO: classificação completa e confiança >= 0.5
  if (isCompleteClassification(photo)) {
    const confidence = photo.aiConfidence ?? 1.0;
    if (confidence >= 0.5) {
      return 'AUTO';
    }
  }
  
  // ROUTINE: tem data válida e tem localização, mas sem categoria completa
  const { yearMonth } = extractDateFolder(photo);
  const hasValidDate = yearMonth !== 'SEM_DATA';
  
  if (hasValidDate && hasLocationHint(photo)) {
    return 'ROUTINE';
  }
  
  // UNIDENTIFIED: tudo mais
  return 'UNIDENTIFIED';
}

/**
 * Formata ano/mês para nome de pasta
 * Ex: "2025-08" -> "08_AGOSTO_2025"
 */
function formatYearMonthFolder(yearMonth: string): string {
  if (!yearMonth || yearMonth === 'SEM_DATA') return 'SEM_DATA';
  const [year, month] = yearMonth.split('-');
  if (!year || !month) return 'SEM_DATA';
  const monthNames = ['', 'JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const monthNum = parseInt(month, 10);
  return `${month}_${monthNames[monthNum] || 'MES'}_${year}`;
}

/**
 * Formata dia para nome de pasta
 * Ex: "30" + yearMonth "2025-08" -> "30_08"
 */
function formatDayFolder(day: string, yearMonth: string): string {
  if (!day || day === 'SEM_DIA') return 'SEM_DIA';
  const month = yearMonth?.split('-')[1] || '00';
  return `${day}_${month}`;
}

/**
 * Constrói o caminho de exportação para uma foto seguindo as regras oficiais
 */
function buildExportPathForPhoto(photo: PhotoData): string {
  const mode = decideMainFolder(photo);
  const { yearMonth, day } = extractDateFolder(photo);
  
  const mesFolder = formatYearMonthFolder(yearMonth);
  const diaFolder = formatDayFolder(day, yearMonth);
  const filename = sanitize(photo.filename, 'foto.jpg');
  
  if (mode === 'AUTO') {
    // Classificação completa: FRENTE/DISCIPLINA/SERVICO/MES/DIA/foto.jpg
    const frente = normalizeName(sanitize(photo.frente, FOLDER_UNIDENTIFIED));
    const disciplina = normalizeName(sanitize(photo.disciplina, 'SEM_DISCIPLINA'));
    const servico = normalizeName(sanitize(photo.servico, 'SEM_SERVICO'));
    return `${frente}/${disciplina}/${servico}/${mesFolder}/${diaFolder}/${filename}`;
  }
  
  if (mode === 'ROUTINE') {
    // Rotina: FOTO_DE_ROTINA/MES/DIA/foto.jpg
    return `${FOLDER_ROUTINE}/${mesFolder}/${diaFolder}/${filename}`;
  }
  
  // UNIDENTIFIED: FOTOS_SEM_IDENTIFICACAO/MES/DIA/foto.jpg
  return `${FOLDER_UNIDENTIFIED}/${mesFolder}/${diaFolder}/${filename}`;
}

/**
 * Gera o arquivo ZIP com a estrutura de pastas organizada
 * Estrutura segue as REGRAS OFICIAIS (nunca cria null/undefined)
 */
export async function generateZip(
  photos: PhotoData[],
  onProgress?: (progress: number) => void
): Promise<void> {
  console.log('[ZIP] Iniciando geração do ZIP...');
  
  const zip = new JSZip();
  const processedPhotos = photos.filter(p => p.status === 'OK' || p.frente || p.servico);
  
  if (processedPhotos.length === 0) {
    throw new Error('Nenhuma foto processada para exportar');
  }

  // Contadores por tipo
  const stats = { auto: 0, routine: 0, unidentified: 0 };

  // Verifica se há múltiplas frentes para nomear o ZIP
  const uniqueFrentes = new Set(processedPhotos.map(p => {
    const mode = decideMainFolder(p);
    if (mode === 'AUTO') return sanitize(p.frente, FOLDER_UNIDENTIFIED);
    if (mode === 'ROUTINE') return FOLDER_ROUTINE;
    return FOLDER_UNIDENTIFIED;
  }));
  
  const timestamp = formatTimestamp();
  let zipName: string;
  
  if (uniqueFrentes.size === 1 && 
      !uniqueFrentes.has(FOLDER_UNIDENTIFIED) && 
      !uniqueFrentes.has(FOLDER_ROUTINE)) {
    const frenteName = normalizeName([...uniqueFrentes][0]);
    zipName = `${frenteName}_Organizado_${timestamp}.zip`;
  } else {
    zipName = `Organizado_${timestamp}.zip`;
  }

  // Adiciona cada foto na estrutura correta
  for (let i = 0; i < processedPhotos.length; i++) {
    const photo = processedPhotos[i];
    const filePath = buildExportPathForPhoto(photo);
    
    // Contabiliza estatísticas
    const mode = decideMainFolder(photo);
    if (mode === 'AUTO') stats.auto++;
    else if (mode === 'ROUTINE') stats.routine++;
    else stats.unidentified++;
    
    // Lê o arquivo como ArrayBuffer
    const arrayBuffer = await photo.file.arrayBuffer();
    zip.file(filePath, arrayBuffer);
    
    onProgress?.(Math.round(((i + 1) / processedPhotos.length) * 100));
    console.log(`[ZIP] Adicionado: ${filePath}`);
  }

  console.log(`[ZIP] Estatísticas: AUTO=${stats.auto}, ROTINA=${stats.routine}, SEM_ID=${stats.unidentified}`);

  // Gera e baixa o ZIP
  console.log('[ZIP] Comprimindo...');
  const content = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  }, (metadata) => {
    onProgress?.(Math.round(metadata.percent));
  });

  saveAs(content, zipName);
  console.log(`[ZIP] Download iniciado: ${zipName}`);
}

/**
 * Gera o arquivo CSV com os metadados
 */
export function generateCSV(photos: PhotoData[]): void {
  console.log('[CSV] Gerando CSV...');
  
  const headers = [
    'filename',
    'date_iso',
    'year_month',
    'day',
    'hora',
    'frente',
    'disciplina',
    'servico',
    'latitude',
    'longitude',
    'alertas',
    'confianca',
    'ocr_text'
  ];

  const escapeCSV = (value: string | number | null | string[]): string => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) {
      return `"${value.join('; ')}"`;
    }
    const str = String(value);
    // Escapa aspas duplas e envolve em aspas se necessário
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = photos.map(photo => [
    escapeCSV(photo.filename),
    escapeCSV(photo.dateIso),
    escapeCSV(photo.yearMonth),
    escapeCSV(photo.day),
    escapeCSV(photo.hora),
    escapeCSV(photo.frente),
    escapeCSV(photo.disciplina),
    escapeCSV(photo.servico),
    escapeCSV(photo.latitude),
    escapeCSV(photo.longitude),
    escapeCSV(photo.alertas),
    escapeCSV(photo.aiConfidence),
    escapeCSV(photo.ocrText),
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');
  
  // Adiciona BOM para UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  
  const timestamp = formatTimestamp();
  saveAs(blob, `index_${timestamp}.csv`);
  
  console.log('[CSV] Download iniciado');
}