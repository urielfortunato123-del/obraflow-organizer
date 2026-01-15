import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
}

/**
 * Processa OCR em uma imagem usando Tesseract.js
 */
export async function processOCR(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  console.log(`[OCR] Iniciando processamento: ${imageFile.name}`);
  
  try {
    const result = await Tesseract.recognize(imageFile, 'por+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && m.progress !== undefined) {
          onProgress?.(Math.round(m.progress * 100));
        }
      },
    });

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
