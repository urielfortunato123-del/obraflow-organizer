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
