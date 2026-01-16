import { supabase } from '@/integrations/supabase/client';

export interface OCRResult {
  text: string;
  confidence: number;
  date?: string | null;
  local?: string | null;
  servico?: string | null;
  disciplina?: string | null;
  engines?: {
    google?: { success: boolean; confidence: number };
    azure?: { success: boolean; confidence: number };
    gemini?: { success: boolean; confidence: number };
    groq?: { success: boolean; confidence: number };
  };
}

export interface OCROptions {
  apiKey?: string;
  liteMode?: boolean;
  useVision?: boolean;
  useMultiOCR?: boolean; // Usar múltiplos OCR engines em paralelo
}

const OCR_SPACE_API = 'https://api.ocr.space/parse/image';

/**
 * Converte File para base64 (retorna só o conteúdo, sem prefixo)
 */
async function fileToBase64Content(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo data:image/...;base64,
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Converte File para base64 (com prefixo completo)
 */
async function fileToBase64Full(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Redimensiona imagem para OCR mais rápido
 */
async function resizeImageForOCR(file: File, maxWidth: number = 1024): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= maxWidth) {
        URL.revokeObjectURL(img.src);
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const scale = maxWidth / img.width;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível criar contexto canvas'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, { type: 'image/jpeg' });
            URL.revokeObjectURL(img.src);
            resolve(resizedFile);
          } else {
            reject(new Error('Falha ao criar blob'));
          }
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Processa OCR usando MÚLTIPLOS engines em paralelo (Google Vision + Azure + Gemini)
 * Mais preciso e robusto
 */
async function processMultiOCR(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  console.log(`[Multi-OCR] Iniciando processamento paralelo: ${imageFile.name}`);
  onProgress?.(10);

  try {
    // Redimensiona se muito grande
    let processFile = imageFile;
    if (imageFile.size > 2 * 1024 * 1024) {
      console.log(`[Multi-OCR] Redimensionando imagem grande: ${(imageFile.size / 1024 / 1024).toFixed(1)}MB`);
      processFile = await resizeImageForOCR(imageFile, 1600);
      console.log(`[Multi-OCR] Novo tamanho: ${(processFile.size / 1024 / 1024).toFixed(1)}MB`);
    }

    onProgress?.(30);

    const base64Content = await fileToBase64Content(processFile);
    const mimeType = processFile.type || 'image/jpeg';
    
    onProgress?.(50);

    const { data, error } = await supabase.functions.invoke('ocr-multi', {
      body: { imageBase64: base64Content, mimeType },
    });

    onProgress?.(90);

    if (error) {
      console.error('[Multi-OCR] Erro:', error);
      throw new Error(error.message || 'Erro no Multi-OCR');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    console.log(`[Multi-OCR] Concluído: ${imageFile.name}`);
    console.log(`[Multi-OCR] Engines:`, data.engines);

    onProgress?.(100);

    return {
      text: data.text || '',
      confidence: data.confidence || 0,
      date: data.date,
      local: data.local,
      servico: data.servico,
      disciplina: data.disciplina,
      engines: data.engines,
    };

  } catch (error) {
    console.error(`[Multi-OCR] Erro ao processar ${imageFile.name}:`, error);
    throw error;
  }
}

/**
 * Processa OCR usando Gemini Vision (Lovable AI)
 * Fallback quando multi-OCR não está disponível
 */
async function processOCRVision(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  console.log(`[OCR Vision] Iniciando processamento com Gemini: ${imageFile.name}`);
  onProgress?.(10);

  try {
    let processFile = imageFile;
    if (imageFile.size > 2 * 1024 * 1024) {
      console.log(`[OCR Vision] Redimensionando imagem grande: ${(imageFile.size / 1024 / 1024).toFixed(1)}MB`);
      processFile = await resizeImageForOCR(imageFile, 1600);
      console.log(`[OCR Vision] Novo tamanho: ${(processFile.size / 1024 / 1024).toFixed(1)}MB`);
    }

    onProgress?.(30);

    const base64Content = await fileToBase64Content(processFile);
    const mimeType = processFile.type || 'image/jpeg';
    
    onProgress?.(50);

    const { data, error } = await supabase.functions.invoke('ocr-vision', {
      body: { imageBase64: base64Content, mimeType },
    });

    onProgress?.(90);

    if (error) {
      console.error('[OCR Vision] Erro na edge function:', error);
      throw new Error(error.message || 'Erro no OCR Vision');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    console.log(`[OCR Vision] Concluído: ${imageFile.name}`);

    onProgress?.(100);

    return {
      text: data.text || '',
      confidence: data.confidence || 0,
      date: data.date,
      local: data.local,
      servico: data.servico,
      disciplina: data.disciplina,
    };

  } catch (error) {
    console.error(`[OCR Vision] Erro ao processar ${imageFile.name}:`, error);
    throw error;
  }
}

/**
 * Processa OCR usando OCR.space API (fallback)
 */
async function processOCRSpace(
  imageFile: File,
  options: OCROptions,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  const { apiKey, liteMode = false } = options;

  if (!apiKey) {
    throw new Error('Chave da API OCR.space não configurada');
  }

  console.log(`[OCR.space] Iniciando processamento ${liteMode ? '(LITE/Engine 1)' : '(Engine 2)'}: ${imageFile.name}`);
  onProgress?.(10);

  try {
    // Redimensiona se muito grande (limite OCR.space: 1MB gratuito)
    let processFile = imageFile;
    if (imageFile.size > 900 * 1024) {
      console.log(`[OCR.space] Redimensionando imagem grande: ${(imageFile.size / 1024).toFixed(0)}KB`);
      processFile = await resizeImageForOCR(imageFile, liteMode ? 800 : 1200);
      console.log(`[OCR.space] Novo tamanho: ${(processFile.size / 1024).toFixed(0)}KB`);
    }

    onProgress?.(30);

    // Converte para base64 (com prefixo)
    const base64 = await fileToBase64Full(processFile);
    
    onProgress?.(50);

    // Monta FormData
    const formData = new FormData();
    formData.append('apikey', apiKey);
    formData.append('base64Image', base64);
    formData.append('language', 'por');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', liteMode ? '1' : '2');

    onProgress?.(60);

    const response = await fetch(OCR_SPACE_API, {
      method: 'POST',
      body: formData,
    });

    onProgress?.(90);

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      const errorMessage = data.ErrorMessage?.[0] || 'Erro desconhecido no OCR';
      console.error('[OCR.space] Erro:', errorMessage);
      throw new Error(errorMessage);
    }

    const parsedResults = data.ParsedResults;
    if (!parsedResults || parsedResults.length === 0) {
      console.warn('[OCR.space] Nenhum texto encontrado');
      return { text: '', confidence: 0 };
    }

    const text = parsedResults.map((r: any) => r.ParsedText || '').join('\n').trim();
    const exitCode = parsedResults[0]?.FileParseExitCode || 0;
    const confidence = exitCode === 1 ? 85 : exitCode === 0 ? 95 : 50;

    console.log(`[OCR.space] Concluído: ${imageFile.name}`);
    console.log(`[OCR.space] Texto extraído (primeiros 200 chars): ${text.substring(0, 200)}`);

    onProgress?.(100);

    return { text, confidence };

  } catch (error) {
    console.error(`[OCR.space] Erro ao processar ${imageFile.name}:`, error);
    throw error;
  }
}

/**
 * Processa OCR de uma imagem
 * Prioridade:
 * 1. Multi-OCR (Google Vision + Azure + Gemini em paralelo) - mais robusto
 * 2. Gemini Vision (fallback)
 * 3. OCR.space (último fallback)
 */
export async function processOCR(
  imageFile: File,
  options: OCROptions,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  const useMultiOCR = options.useMultiOCR !== false; // Padrão é true agora
  const useVision = options.useVision !== false;

  // Tenta Multi-OCR primeiro (mais robusto)
  if (useMultiOCR) {
    try {
      return await processMultiOCR(imageFile, onProgress);
    } catch (error) {
      console.warn('[OCR] Multi-OCR falhou, tentando Gemini Vision...');
    }
  }

  // Fallback para Gemini Vision
  if (useVision) {
    try {
      return await processOCRVision(imageFile, onProgress);
    } catch (error) {
      console.warn('[OCR] Gemini Vision falhou, tentando OCR.space...');
      
      if (options.apiKey) {
        return await processOCRSpace(imageFile, options, onProgress);
      }
      
      throw error;
    }
  }

  // Último fallback: OCR.space
  return await processOCRSpace(imageFile, options, onProgress);
}

/**
 * Extrai as primeiras N linhas do texto OCR
 */
export function getOCRPreview(text: string, lines: number = 2): string {
  if (!text) return '';
  
  const allLines = text.split('\n').filter(line => line.trim());
  return allLines.slice(0, lines).join('\n');
}
