export interface PhotoData {
  id: string;
  file: File;
  thumbnailUrl: string;
  filename: string;
  
  // OCR results
  ocrText: string;
  ocrStatus: 'pending' | 'processing' | 'success' | 'error';
  
  // Extracted data
  dateIso: string | null;
  yearMonth: string | null;
  latitude: number | null;
  longitude: number | null;
  
  // AI Classification
  local: string;
  servico: string;
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

export const SERVICE_CATEGORIES = [
  'Execução de limpeza',
  'Escavação',
  'Reaterro',
  'Drenagem',
  'Concretagem',
  'Recomposição',
  'Terraplenagem',
  'Sinalização',
  'Roçada',
  'Pavimentação',
  'Instalação elétrica',
  'Instalação hidráulica',
  'Fundação',
  'Estrutura',
  'Acabamento',
];
