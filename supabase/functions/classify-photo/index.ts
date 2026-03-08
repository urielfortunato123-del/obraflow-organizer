import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.status === 429 || response.status === 503) {
      const delay = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000;
      console.log(`[retry] 429/503, aguardando ${Math.round(delay)}ms (tentativa ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    return response;
  }
  return fetch(url, options);
}

// Categorias de trabalho (nível 2 da estrutura)
const WORK_CATEGORIES = [
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
const SERVICE_TYPES = [
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

interface ClassifyRequest {
  ocrText: string;
  dateIso: string | null;
  yearMonth: string | null;
  latitude: number | null;
  longitude: number | null;
  userLocal: string;
  userServico: string;
  liteMode?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY não configurada");
    }

    const input: ClassifyRequest = await req.json();

    const liteModeNote = input.liteMode 
      ? `\n\nNOTA IMPORTANTE: O texto OCR foi processado em modo LITE (qualidade menor).
Pode conter erros de leitura. Tente inferir palavras parciais ou corrompidas pelo contexto.
Exemplo: "Escav" pode ser "Escavação", "Pav" pode ser "Pavimentação", etc.`
      : '';

    const systemPrompt = `Você é um assistente especializado em classificar fotos de obras de construção.
Analise o texto OCR fornecido e retorne APENAS um JSON válido (sem markdown, sem explicações) com a seguinte estrutura:
{
  "local": "string curta e clara do local da obra (ex: Free Flow P-09, Pórtico 12)",
  "categoria": "categoria do trabalho em MAIÚSCULAS",
  "servico": "tipo específico do serviço em MAIÚSCULAS",
  "year_month": "YYYY-MM",
  "confianca": número de 0 a 100
}

Regras:
1. Se o usuário forneceu local, use-o (apenas padronize acentos e caixa se necessário).
2. Para CATEGORIA, escolha uma destas: ${WORK_CATEGORIES.join(', ')}.
3. Para SERVIÇO, escolha uma destas ou infira do texto: ${SERVICE_TYPES.join(', ')}.
4. Se não conseguir inferir o local com segurança, use "LOCAL_NAO_INFORMADO".
5. Se não conseguir inferir a categoria, use "CATEGORIA_NAO_INFORMADA".
6. Se não conseguir inferir o serviço, use "SERVICO_NAO_INFORMADO".
7. Para year_month, use a data detectada. Não invente mês.
8. A confiança deve refletir quão certo você está da classificação.${liteModeNote}

Exemplos de classificação:
- "Pintura da fachada do prédio" → categoria: "ACABAMENTO EXTERNO", servico: "PINTURA EXTERNA"
- "Troca de telhas" → categoria: "COBERTURA", servico: "MANUTENÇÃO CORRETIVA"
- "Limpeza do terreno" → categoria: "LIMPEZA", servico: "EXECUÇÃO DE LIMPEZA"`;

    const userContent = `Classifique esta foto de obra:

Texto OCR:
${input.ocrText || '(sem texto detectado)'}

Data detectada: ${input.dateIso || 'não detectada'}
Mês/Ano: ${input.yearMonth || 'não detectado'}
Coordenadas: ${input.latitude !== null ? `${input.latitude}, ${input.longitude}` : 'não detectadas'}

Local informado pelo usuário: ${input.userLocal || '(não informado)'}
Serviço informado pelo usuário: ${input.userServico || '(não informado)'}

Retorne apenas o JSON, sem explicações.`;

    console.log('[classify-photo] Chamando Google AI Studio...');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 250,
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido. Aguarde um momento e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("[classify-photo] Erro AI:", response.status, errorText);
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    // Limpa markdown code blocks se houver
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    console.log('[classify-photo] Resposta:', cleanContent);

    const parsed = JSON.parse(cleanContent);

    // Validação básica
    if (!parsed.local || !parsed.servico) {
      throw new Error("Resposta da IA incompleta");
    }

    // Garante que categoria existe
    if (!parsed.categoria) {
      parsed.categoria = 'CATEGORIA_NAO_INFORMADA';
    }

    // Usa year_month da IA apenas se não temos um detectado
    if (!parsed.year_month && input.yearMonth) {
      parsed.year_month = input.yearMonth;
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[classify-photo] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
