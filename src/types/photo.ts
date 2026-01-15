export interface PhotoData {
  id: string;
  file: File;
  thumbnailUrl: string;
  filename: string;
  folderPath: string; // Caminho relativo da pasta de origem
  
  // OCR results
  ocrText: string;
  ocrStatus: 'pending' | 'processing' | 'success' | 'error';
  
  // Extracted data
  dateIso: string | null;
  yearMonth: string | null;
  day: string | null; // Dia do mês (ex: "30")
  latitude: number | null;
  longitude: number | null;
  
  // AI Classification
  local: string;
  categoria: string; // ACABAMENTO EXTERNO, COBERTURA, MANUTENÇÃO, etc.
  servico: string; // PINTURA EXTERNA, etc.
  aiStatus: 'pending' | 'processing' | 'success' | 'error' | 'skipped';
  aiConfidence: number | null;
  
  // Overall status
  status: 'OK' | 'OCR Falhou' | 'IA Falhou' | 'Pendente';
}

export interface AppSettings {
  ocrApiKey: string; // API OCR.space
  ocrEnabled: boolean;
  aiEnabled: boolean;
  liteMode: boolean; // OCR rápido + IA compensa
  defaultLocal: string;
  defaultServico: string;
}

export interface AIResponse {
  local: string;
  categoria: string;
  servico: string;
  year_month: string;
  confianca: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  ocrApiKey: '',
  ocrEnabled: true,
  aiEnabled: true,
  liteMode: true, // Modo econômico ativo por padrão
  defaultLocal: '',
  defaultServico: '',
};

// Categorias de trabalho (nível 2 da estrutura)
export const WORK_CATEGORIES = [
  'ACABAMENTO EXTERNO',
  'ACABAMENTO INTERNO',
  'COBERTURA',
  'MANUTENÇÃO',
  'SEGURANÇA',
  'ESTRUTURA',
  'FUNDAÇÃO',
  'INSTALAÇÕES ELÉTRICAS',
  'INSTALAÇÕES HIDRÁULICAS',
  'TERRAPLANAGEM',
  'PAVIMENTAÇÃO',
  'DRENAGEM',
  'SINALIZAÇÃO',
  'PAISAGISMO',
  'DEMOLIÇÃO',
  'LIMPEZA',
];

// Tipos de serviço (nível 3 da estrutura)
export const SERVICE_TYPES = [
  'PINTURA EXTERNA',
  'PINTURA INTERNA',
  'REBOCO',
  'REVESTIMENTO',
  'EXECUÇÃO DE LIMPEZA',
  'ESCAVAÇÃO',
  'REATERRO',
  'CONCRETAGEM',
  'RECOMPOSIÇÃO',
  'ROÇADA',
  'INSTALAÇÃO',
  'MANUTENÇÃO PREVENTIVA',
  'MANUTENÇÃO CORRETIVA',
  'INSPEÇÃO',
  'VISTORIA',
];
