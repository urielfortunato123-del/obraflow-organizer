// Modo de classificação da foto
export type ClassificationMode = 'AUTO' | 'ROUTINE' | 'UNIDENTIFIED';

// Pastas principais do sistema de fallback
export const FOLDER_ROUTINE = 'FOTO_DE_ROTINA';
export const FOLDER_UNIDENTIFIED = 'FOTOS_SEM_IDENTIFICACAO';

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
  day: string | null;
  hora: string | null; // Hora extraída (ex: "10:36")
  latitude: number | null;
  longitude: number | null;
  
  // AI Classification
  frente: string; // FRENTE DE SERVIÇO (ex: FREE_FLOW_P09, BSO_04)
  disciplina: string; // DISCIPLINA (ex: TERRAPLANAGEM, ACABAMENTO, SINALIZAÇÃO)
  servico: string; // SERVIÇO (ex: LIMPEZA_TERRENO, ALVENARIA)
  aiStatus: 'pending' | 'processing' | 'success' | 'error' | 'skipped';
  aiConfidence: number | null;
  
  // Modo de classificação (AUTO = completo, ROUTINE = só data+local, UNIDENTIFIED = incompleto)
  classificationMode?: ClassificationMode;
  
  // Hint de localização detectado (ex: "KM_070_080", "GPS", "ESTACA_120")
  locationHint?: string;
  
  // Alertas
  alertas: string[]; // Ex: ["SEM PLACA DE IDENTIFICAÇÃO"]
  
  // Overall status
  status: 'OK' | 'OCR Falhou' | 'IA Falhou' | 'Pendente';
  
  // Caminho de destino calculado
  destinationPath?: string;
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
  frente: string;
  disciplina: string;
  servico: string;
  year_month: string;
  hora?: string;
  alertas?: string[];
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

// Disciplinas de trabalho
export const DISCIPLINAS = [
  'TERRAPLANAGEM',
  'SINALIZAÇÃO',
  'ACABAMENTO',
  'COBERTURA',
  'MANUTENÇÃO',
  'SEGURANÇA',
  'ESTRUTURA',
  'FUNDAÇÃO',
  'INSTALAÇÕES ELÉTRICAS',
  'INSTALAÇÕES HIDRÁULICAS',
  'PAVIMENTAÇÃO',
  'DRENAGEM',
  'PAISAGISMO',
  'DEMOLIÇÃO',
  'LIMPEZA',
  'OUTROS',
];

// Tipos de serviço
export const SERVICOS = [
  'LIMPEZA_TERRENO',
  'LIMPEZA_INICIAL',
  'EXECUÇÃO_LIMPEZA',
  'ALVENARIA',
  'PINTURA_EXTERNA',
  'PINTURA_INTERNA',
  'REBOCO',
  'REVESTIMENTO',
  'ESCAVAÇÃO',
  'REATERRO',
  'CONCRETAGEM',
  'RECOMPOSIÇÃO',
  'ROÇADA',
  'INSTALAÇÃO',
  'MANUTENÇÃO_PREVENTIVA',
  'MANUTENÇÃO_CORRETIVA',
  'DISPOSITIVO_SEGURANÇA',
  'SINALIZAÇÃO_VERTICAL',
  'SINALIZAÇÃO_HORIZONTAL',
  'INSPEÇÃO',
  'VISTORIA',
  'OUTROS',
];
