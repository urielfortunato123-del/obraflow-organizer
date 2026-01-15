import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OCRVisionRequest {
  imageBase64: string;
  mimeType: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const input: OCRVisionRequest = await req.json();

    if (!input.imageBase64) {
      throw new Error("imageBase64 é obrigatório");
    }

    console.log('[ocr-vision] Processando imagem com Gemini Vision...');

    const systemPrompt = `Você é um assistente especializado em extrair texto de fotos de obras de construção.
Analise a imagem fornecida e extraia TODO o texto visível, especialmente:
1. Data e hora (geralmente no canto inferior direito)
2. Nome do local ou ponto (ex: "Free Flow P-09", "Km 123", etc.)
3. Descrição do serviço (ex: "Execução de limpeza", "Escavação", etc.)
4. Qualquer coordenada GPS visível

IMPORTANTE: Retorne APENAS um JSON válido (sem markdown, sem explicações) com a seguinte estrutura:
{
  "text": "todo o texto extraído da imagem, linha por linha",
  "date": "data encontrada no formato DD/MM/YYYY HH:MM ou null",
  "local": "nome do local/ponto encontrado ou null",
  "servico": "descrição do serviço encontrado ou null",
  "confidence": número de 0 a 100 indicando confiança na extração
}

Se não conseguir ler alguma informação, use null para o campo correspondente.
O campo "text" deve conter todo o texto visível na imagem, exatamente como aparece.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${input.mimeType};base64,${input.imageBase64}`
                }
              },
              {
                type: "text",
                text: "Extraia todo o texto visível desta foto de obra, especialmente data, local e serviço."
              }
            ]
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
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
      console.error("[ocr-vision] Erro AI:", response.status, errorText);
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    // Limpa markdown code blocks se houver
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    console.log('[ocr-vision] Resposta:', cleanContent);

    const parsed = JSON.parse(cleanContent);

    return new Response(JSON.stringify({
      text: parsed.text || '',
      date: parsed.date || null,
      local: parsed.local || null,
      servico: parsed.servico || null,
      confidence: parsed.confidence || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[ocr-vision] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
