import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Categorias de trabalho expandidas
const WORK_CATEGORIES = [
  'TERRAPLANAGEM', 'PAVIMENTAÇÃO', 'DRENAGEM', 'SINALIZAÇÃO',
  'ESTRUTURA', 'FUNDAÇÃO', 'ALVENARIA', 'COBERTURA',
  'ACABAMENTO_INTERNO', 'ACABAMENTO_EXTERNO',
  'INSTALAÇÕES_ELÉTRICAS', 'INSTALAÇÕES_HIDRÁULICAS',
  'PAISAGISMO', 'LIMPEZA', 'DEMOLIÇÃO', 'MANUTENÇÃO', 'SEGURANÇA',
];

// Serviços comuns
const SERVICE_TYPES = [
  'ESCAVAÇÃO', 'ATERRO', 'COMPACTAÇÃO', 'CONCRETAGEM', 'ARMAÇÃO',
  'PINTURA', 'REBOCO', 'REVESTIMENTO', 'IMPERMEABILIZAÇÃO',
  'INSTALAÇÃO', 'MANUTENÇÃO', 'INSPEÇÃO', 'LIMPEZA', 'ROÇADA',
];

interface PhotoInput {
  id: string;
  filename: string;
  folderPath?: string;
  ocrText?: string;
  dateIso?: string;
  yearMonth?: string;
}

interface BatchRequest {
  photos: PhotoInput[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const { photos }: BatchRequest = await req.json();
    
    if (!photos || photos.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma foto para processar" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[classify-batch] Processando ${photos.length} fotos...`);

    // Agrupa fotos por pasta para otimizar
    const byFolder = new Map<string, PhotoInput[]>();
    for (const photo of photos) {
      const folder = photo.folderPath || 'root';
      if (!byFolder.has(folder)) {
        byFolder.set(folder, []);
      }
      byFolder.get(folder)!.push(photo);
    }

    // Cria um resumo compacto para a IA
    const photoSummaries = photos.map((p, i) => {
      const parts = [];
      parts.push(`[${i}] ${p.filename}`);
      if (p.folderPath) parts.push(`pasta: ${p.folderPath}`);
      if (p.ocrText) parts.push(`texto: "${p.ocrText.substring(0, 100)}..."`);
      if (p.dateIso) parts.push(`data: ${p.dateIso}`);
      return parts.join(' | ');
    }).join('\n');

    const systemPrompt = `Você é um classificador ULTRA-RÁPIDO de fotos de obras.
Analise a lista de fotos e classifique TODAS de uma vez.

RETORNE APENAS um array JSON válido (sem markdown) com objetos para CADA foto:
[
  { "id": "id_da_foto", "frente": "LOCAL", "disciplina": "CATEGORIA", "servico": "TIPO" },
  ...
]

REGRAS CRÍTICAS:
1. Use o NOME DA PASTA como pista principal para classificar
2. Fotos na MESMA PASTA geralmente têm a MESMA classificação
3. Para DISCIPLINA, escolha: ${WORK_CATEGORIES.join(', ')}
4. Para SERVIÇO, escolha: ${SERVICE_TYPES.join(', ')}
5. Se não souber, use: frente="FRENTE_NAO_INFORMADA", disciplina="DISCIPLINA_NAO_INFORMADA", servico="SERVICO_NAO_IDENTIFICADO"
6. Seja RÁPIDO e CONSISTENTE

DICAS:
- Nomes de pasta como "FREE_FLOW_P01" → frente: "FREE_FLOW_P01"
- Nomes como "TERRAPLANAGEM" → disciplina: "TERRAPLANAGEM"
- Nomes como "ESCAVACAO" → servico: "ESCAVAÇÃO"
- Arquivos na mesma pasta = mesma classificação`;

    const userContent = `Classifique TODAS estas ${photos.length} fotos:

${photoSummaries}

Retorne o array JSON com a classificação de CADA foto pelo id.`;

    console.log('[classify-batch] Chamando Lovable AI...');

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
          { role: "user", content: userContent },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido. Aguarde um momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("[classify-batch] Erro AI:", response.status, errorText);
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    // Limpa markdown
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    console.log('[classify-batch] Resposta recebida');

    let results;
    try {
      results = JSON.parse(cleanContent);
    } catch (e) {
      console.error('[classify-batch] Erro parse JSON:', cleanContent);
      throw new Error("Resposta da IA não é JSON válido");
    }

    // Garante que é um array
    if (!Array.isArray(results)) {
      results = [results];
    }

    // Mapeia resultados por id
    const resultMap = new Map();
    for (const r of results) {
      if (r.id) {
        resultMap.set(r.id, {
          frente: r.frente || r.local || 'FRENTE_NAO_INFORMADA',
          disciplina: r.disciplina || r.categoria || 'DISCIPLINA_NAO_INFORMADA',
          servico: r.servico || 'SERVICO_NAO_IDENTIFICADO',
        });
      }
    }

    // Propaga classificação para fotos não classificadas na mesma pasta
    for (const [folder, folderPhotos] of byFolder) {
      // Encontra uma foto classificada nesta pasta
      let classification = null;
      for (const p of folderPhotos) {
        if (resultMap.has(p.id)) {
          classification = resultMap.get(p.id);
          break;
        }
      }
      
      // Aplica a todas as fotos da pasta sem classificação
      if (classification) {
        for (const p of folderPhotos) {
          if (!resultMap.has(p.id)) {
            resultMap.set(p.id, classification);
          }
        }
      }
    }

    // Converte de volta para array
    const finalResults = photos.map(p => ({
      id: p.id,
      ...(resultMap.get(p.id) || {
        frente: 'FRENTE_NAO_INFORMADA',
        disciplina: 'DISCIPLINA_NAO_INFORMADA',
        servico: 'SERVICO_NAO_IDENTIFICADO',
      }),
    }));

    console.log(`[classify-batch] ${finalResults.length} fotos classificadas`);

    return new Response(JSON.stringify({ results: finalResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[classify-batch] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
