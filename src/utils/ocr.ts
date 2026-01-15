import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface OCROptions {
  liteMode?: boolean; // Modo rápido/econômico
}

/**
 * Redimensiona imagem para OCR mais rápido (modo lite)
 */
async function resizeImageForOCR(file: File, maxWidth: number = 800): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / img.width);
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
            resolve(blob);
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
 * Processa OCR em uma imagem usando Tesseract.js
 * @param liteMode - Usa configuração rápida (imagem menor, menos precisão, mas 3-5x mais rápido)
 */
export async function processOCR(
  imageFile: File,
  onProgress?: (progress: number) => void,
  options: OCROptions = {}
): Promise<OCRResult> {
  const { liteMode = false } = options;
  
  console.log(`[OCR] Iniciando processamento ${liteMode ? '(LITE)' : '(FULL)'}: ${imageFile.name}`);
  
  try {
    // No modo lite, reduz a imagem para acelerar
    let imageSource: File | Blob = imageFile;
    if (liteMode) {
      try {
        imageSource = await resizeImageForOCR(imageFile, 800);
        console.log(`[OCR] Imagem redimensionada de ${(imageFile.size / 1024).toFixed(0)}KB para ${(imageSource.size / 1024).toFixed(0)}KB`);
      } catch (resizeError) {
        console.warn('[OCR] Falha ao redimensionar, usando original:', resizeError);
      }
    }

    const result = await Tesseract.recognize(
      imageSource, 
      liteMode ? 'por' : 'por+eng', // Só português no modo lite
      {
        logger: (m) => {
          if (m.status === 'recognizing text' && m.progress !== undefined) {
            onProgress?.(Math.round(m.progress * 100));
          }
        },
      }
    );

    const text = result.data.text.trim();
    const confidence = result.data.confidence;

    console.log(`[OCR] Concluído: ${imageFile.name} - Confiança: ${confidence}%`);
    console.log(`[OCR] Texto extraído (primeiros 200 chars): ${text.substring(0, 200)}`);

    return { text, confidence };
  } catch (error) {
    console.error(`[OCR] Erro ao processar ${imageFile.name}:`, error);
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
