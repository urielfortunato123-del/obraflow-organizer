export interface OCRResult {
  text: string;
  confidence: number;
}

export interface OCROptions {
  apiKey: string;
  liteMode?: boolean; // Usa engine mais leve
}

const OCR_SPACE_API = 'https://api.ocr.space/parse/image';

/**
 * Converte File para base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo data:image/...;base64,
      resolve(result);
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Redimensiona imagem para OCR mais rápido (modo lite)
 */
async function resizeImageForOCR(file: File, maxWidth: number = 1024): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Se já é menor, retorna original
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
 * Processa OCR usando OCR.space API
 * - Gratuito: 25.000 requisições/mês
 * - Engines: 1 (rápido), 2 (preciso), 3 (melhor para texto manuscrito)
 */
export async function processOCR(
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

    // Converte para base64
    const base64 = await fileToBase64(processFile);
    
    onProgress?.(50);

    // Monta FormData
    const formData = new FormData();
    formData.append('apikey', apiKey);
    formData.append('base64Image', base64);
    formData.append('language', 'por'); // Português
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', liteMode ? '1' : '2'); // Engine 1 = rápido, 2 = preciso

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
    
    // OCR.space não retorna confiança direta, estimamos pelo exit code
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
 * Extrai as primeiras N linhas do texto OCR
 */
export function getOCRPreview(text: string, lines: number = 2): string {
  if (!text) return '';
  
  const allLines = text.split('\n').filter(line => line.trim());
  return allLines.slice(0, lines).join('\n');
}
