import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { PhotoData } from '@/types/photo';
import { normalizeName, formatTimestamp } from './helpers';

/**
 * Formata ano/mês para nome de pasta
 * Ex: "2025-08" -> "08_AGOSTO_2025"
 */
function formatYearMonthFolder(yearMonth: string | null): string {
  if (!yearMonth) return 'SEM_DATA';
  const [year, month] = yearMonth.split('-');
  const monthNames = ['', 'JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const monthNum = parseInt(month, 10);
  return `${month}_${monthNames[monthNum] || 'MES'}_${year}`;
}

/**
 * Formata dia para nome de pasta
 * Ex: "2025-08-30" -> "30_08"
 */
function formatDayFolder(dateIso: string | null): string {
  if (!dateIso) return 'SEM_DIA';
  const parts = dateIso.split('-');
  if (parts.length < 3) return 'SEM_DIA';
  return `${parts[2]}_${parts[1]}`;
}

/**
 * Gera o arquivo ZIP com a estrutura de pastas organizada
 * Estrutura: LOCAL / CATEGORIA / SERVIÇO / MÊS / DIA / fotos
 */
export async function generateZip(
  photos: PhotoData[],
  onProgress?: (progress: number) => void
): Promise<void> {
  console.log('[ZIP] Iniciando geração do ZIP...');
  
  const zip = new JSZip();
  const processedPhotos = photos.filter(p => p.status === 'OK' || p.local || p.servico);
  
  if (processedPhotos.length === 0) {
    throw new Error('Nenhuma foto processada para exportar');
  }

  // Verifica se há múltiplos locais
  const uniqueLocals = new Set(processedPhotos.map(p => p.local || 'LOCAL_NAO_INFORMADO'));
  const timestamp = formatTimestamp();

  let zipName: string;
  if (uniqueLocals.size === 1 && !uniqueLocals.has('LOCAL_NAO_INFORMADO')) {
    const localName = normalizeName([...uniqueLocals][0]);
    zipName = `${localName}_Organizado_${timestamp}.zip`;
  } else {
    zipName = `Organizado_${timestamp}.zip`;
  }

  // Adiciona cada foto na estrutura correta
  // Estrutura: LOCAL / CATEGORIA / SERVIÇO / MÊS / DIA / foto
  for (let i = 0; i < processedPhotos.length; i++) {
    const photo = processedPhotos[i];
    
    const localFolder = normalizeName(photo.local || 'LOCAL_NAO_INFORMADO');
    const categoriaFolder = normalizeName(photo.categoria || 'CATEGORIA_NAO_INFORMADA');
    const servicoFolder = normalizeName(photo.servico || 'SERVICO_NAO_INFORMADO');
    const mesFolder = formatYearMonthFolder(photo.yearMonth);
    const diaFolder = formatDayFolder(photo.dateIso);
    
    const folderPath = `${localFolder}/${categoriaFolder}/${servicoFolder}/${mesFolder}/${diaFolder}`;
    const filePath = `${folderPath}/${photo.filename}`;
    
    // Lê o arquivo como ArrayBuffer
    const arrayBuffer = await photo.file.arrayBuffer();
    zip.file(filePath, arrayBuffer);
    
    onProgress?.(Math.round(((i + 1) / processedPhotos.length) * 100));
    console.log(`[ZIP] Adicionado: ${filePath}`);
  }

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
    'local',
    'categoria',
    'servico',
    'latitude',
    'longitude',
    'ocr_text'
  ];

  const escapeCSV = (value: string | number | null): string => {
    if (value === null || value === undefined) return '';
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
    escapeCSV(photo.local),
    escapeCSV(photo.categoria),
    escapeCSV(photo.servico),
    escapeCSV(photo.latitude),
    escapeCSV(photo.longitude),
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
