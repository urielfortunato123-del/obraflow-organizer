import type { AIResponse, AppSettings } from '@/types/photo';
import { SERVICE_CATEGORIES } from '@/types/photo';

interface AIClassificationInput {
  ocrText: string;
  dateIso: string | null;
  yearMonth: string | null;
  latitude: number | null;
  longitude: number | null;
  userLocal: string;
  userServico: string;
}

/**
 * Classifica uma foto usando a API de IA configurada
 */
export async function classifyWithAI(
  input: AIClassificationInput,
  settings: AppSettings
): Promise<AIResponse> {
  console.log('[AI] Iniciando classificação...');
  
  if (!settings.apiKey) {
    throw new Error('Chave da API não configurada');
  }

  const systemPrompt = `Você é um assistente especializado em classificar fotos de obras de construção.
Analise o texto OCR fornecido e retorne APENAS um JSON válido (sem markdown, sem explicações) com a seguinte estrutura:
{
  "local": "string curta e clara do local da obra",
  "servico": "string curta e clara do tipo de serviço",
  "year_month": "YYYY-MM",
  "confianca": número de 0 a 100
}

Regras:
1. Se o usuário forneceu local, use-o (apenas padronize acentos e caixa se necessário).
2. Se o usuário forneceu serviço, use-o (apenas padronize).
3. Se serviço não foi fornecido, classifique baseado no texto OCR. Categorias sugeridas: ${SERVICE_CATEGORIES.join(', ')}.
4. Se não conseguir inferir o local com segurança, use "LOCAL_NAO_INFORMADO".
5. Para year_month, use a data detectada. Não invente mês.
6. A confiança deve refletir quão certo você está da classificação.`;

  const userContent = `Classifique esta foto de obra:

Texto OCR:
${input.ocrText || '(sem texto detectado)'}

Data detectada: ${input.dateIso || 'não detectada'}
Mês/Ano: ${input.yearMonth || 'não detectado'}
Coordenadas: ${input.latitude !== null ? `${input.latitude}, ${input.longitude}` : 'não detectadas'}

Local informado pelo usuário: ${input.userLocal || '(não informado)'}
Serviço informado pelo usuário: ${input.userServico || '(não informado)'}

Retorne apenas o JSON, sem explicações.`;

  try {
    const response = await fetch(settings.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI] Erro na resposta:', response.status, errorText);
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    // Limpa o conteúdo (remove possíveis markdown code blocks)
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    console.log('[AI] Resposta limpa:', cleanContent);

    const parsed: AIResponse = JSON.parse(cleanContent);

    // Validação básica
    if (!parsed.local || !parsed.servico) {
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
 * Verifica se a IA está disponível (online + API key)
 */
export function isAIAvailable(settings: AppSettings): boolean {
  return navigator.onLine && !!settings.apiKey && settings.aiEnabled;
}
