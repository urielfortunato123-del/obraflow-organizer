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
  
  // Campos padrão
  defaultLocal: string; // Empresa/Cliente - pasta raiz
  defaultServico: string; // Frente de serviço padrão
  
  // Opções de processamento
  organizePorData: boolean; // Cria subpastas mes_ano/dia_mes
  prioridadeIA: boolean; // Usa análise avançada com Gemini/GPT
  ocrLocal: boolean; // Extrai texto antes da IA (-60% custo)
  modoEconomico: boolean; // 2x mais fotos por $ (modelo leve)
  correcaoIA: boolean; // Corrige erros de OCR automaticamente
  
  // Dicionário OCR personalizado
  ocrDictionary: string[];
  
  // Legacy (para compatibilidade)
  ocrEnabled: boolean;
  aiEnabled: boolean;
  liteMode: boolean;
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
  defaultLocal: '',
  defaultServico: '',
  organizePorData: true,
  prioridadeIA: true,
  ocrLocal: true,
  modoEconomico: true,
  correcaoIA: true,
  ocrDictionary: [],
  ocrEnabled: true,
  aiEnabled: true,
  liteMode: true,
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
