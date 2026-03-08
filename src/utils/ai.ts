import type { AIResponse, AppSettings } from '@/types/photo';
import { supabase } from '@/integrations/supabase/client';

interface AIClassificationInput {
  ocrText: string;
  dateIso: string | null;
  yearMonth: string | null;
  latitude: number | null;
  longitude: number | null;
  userFrente: string;
  userServico: string;
  liteMode?: boolean;
}

/**
 * Classifica uma foto usando Google AI Studio
 * Usa edge function para não expor API keys
 * Inclui retry com backoff para rate limiting
 */
export async function classifyWithAI(
  input: AIClassificationInput,
  _settings: AppSettings
): Promise<AIResponse> {
  console.log('[AI] Iniciando classificação via Google AI Studio...');
  
  const MAX_RETRIES = 3;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('classify-photo', {
        body: {
          ocrText: input.ocrText,
          dateIso: input.dateIso,
          yearMonth: input.yearMonth,
          latitude: input.latitude,
          longitude: input.longitude,
          userFrente: input.userFrente,
          userServico: input.userServico,
          liteMode: input.liteMode,
        },
      });

      if (error) {
        if ((error.message?.includes('429') || error.message?.includes('Rate limit')) && attempt < MAX_RETRIES - 1) {
          const delay = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000;
          console.warn(`[AI] Rate limit, retry em ${Math.round(delay)}ms (${attempt + 1}/${MAX_RETRIES})`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        console.error('[AI] Erro na edge function:', error);
        throw new Error(error.message || 'Erro na classificação');
      }

      if (data.error) {
        if (data.error.includes('Rate limit') && attempt < MAX_RETRIES - 1) {
          const delay = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000;
          console.warn(`[AI] Rate limit (data), retry em ${Math.round(delay)}ms`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new Error(data.error);
      }

      const parsed: AIResponse = {
        frente: data.frente || data.local || '',
        disciplina: data.disciplina || data.categoria || '',
        servico: data.servico || '',
        year_month: data.year_month || '',
        hora: data.hora || '',
        alertas: data.alertas || [],
        confianca: data.confianca || 0,
      };

      if (!parsed.frente || !parsed.servico) {
        throw new Error('Resposta da IA incompleta');
      }

      if (!parsed.year_month && input.yearMonth) {
        parsed.year_month = input.yearMonth;
      }

      console.log('[AI] Classificação concluída:', parsed);
      return parsed;

    } catch (error) {
      if (attempt === MAX_RETRIES - 1) {
        console.error('[AI] Erro na classificação após retries:', error);
        throw error;
      }
    }
  }

  throw new Error('Falha na classificação após múltiplas tentativas');
}

/**
 * Verifica se a IA está disponível (online)
 */
export function isAIAvailable(settings: AppSettings): boolean {
  return navigator.onLine && settings.prioridadeIA;
}
