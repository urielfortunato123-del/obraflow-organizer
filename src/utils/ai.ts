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
 * Classifica uma foto usando Lovable AI (Gemini Lite)
 * Usa edge function para não expor API keys
 */
export async function classifyWithAI(
  input: AIClassificationInput,
  _settings: AppSettings
): Promise<AIResponse> {
  console.log('[AI] Iniciando classificação via Lovable AI...');
  
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
      console.error('[AI] Erro na edge function:', error);
      throw new Error(error.message || 'Erro na classificação');
    }

    if (data.error) {
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

    // Validação básica
    if (!parsed.frente || !parsed.servico) {
      throw new Error('Resposta da IA incompleta');
    }

    // Usa year_month da IA apenas se não temos um detectado
    if (!parsed.year_month && input.yearMonth) {
      parsed.year_month = input.yearMonth;
    }

    console.log('[AI] Classificação concluída:', parsed);
    return parsed;

  } catch (error) {
    console.error('[AI] Erro na classificação:', error);
    throw error;
  }
}

/**
 * Verifica se a IA está disponível (online)
 */
export function isAIAvailable(settings: AppSettings): boolean {
  return navigator.onLine && settings.prioridadeIA;
}