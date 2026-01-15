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
  apiKey: string;
  endpoint: string;
  model: string;
  ocrEnabled: boolean;
  aiEnabled: boolean;
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
  apiKey: '',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  ocrEnabled: true,
  aiEnabled: true,
  defaultLocal: '',
  defaultServico: '',
};

export const AI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

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
