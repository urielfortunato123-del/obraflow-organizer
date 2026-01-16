import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Listas de valores permitidos
const CATEGORIAS = [
  'TERRAPLANAGEM', 'PAVIMENTACAO', 'DRENAGEM', 'SINALIZACAO',
  'ESTRUTURA', 'FUNDACAO', 'ALVENARIA', 'COBERTURA',
  'INSTALACOES_ELETRICAS', 'INSTALACOES_HIDRAULICAS',
  'PAISAGISMO', 'LIMPEZA', 'DEMOLICAO', 'MANUTENCAO',
];

const SERVICOS = [
  'LIMPEZA_DE_TERRENO', 'ROCADA_MECANIZADA', 'ROCADA_MANUAL',
  'ESCAVACAO_DE_VALA', 'ESCAVACAO_MECANIZADA', 'MOVIMENTACAO_DE_TERRA',
  'ATERRO', 'COMPACTACAO', 'REGULARIZACAO_SUBLEITO',
  'ASSENTAMENTO_DE_TUBOS', 'EXECUCAO_DE_DRENAGEM', 'LIMPEZA_DE_BUEIRO',
  'CONCRETAGEM', 'ARMACAO_DE_ACO', 'EXECUCAO_DE_FORMA', 'LANCAMENTO_CONCRETO',
  'EXECUCAO_DE_BASE', 'EXECUCAO_DE_PAVIMENTO', 'FRESAGEM', 'RECAPEAMENTO',
  'SINALIZACAO_HORIZONTAL', 'SINALIZACAO_VERTICAL', 'IMPLANTACAO_DE_PLACAS',
  'PLANTIO_DE_GRAMA', 'PAISAGISMO',
  'PINTURA', 'REBOCO', 'REVESTIMENTO',
  'MANUTENCAO_PREVENTIVA', 'MANUTENCAO_CORRETIVA', 'INSPECAO', 'VISTORIA',
];

interface PhotoInput {
  id: string;
  filename: string;
  folderPath?: string;
  ocrText?: string;
  dateIso?: string;
  empresa?: string;
  // Campos já extraídos (para IA não sobrescrever)
  existingFrente?: string;
  existingCategoria?: string;
  existingServico?: string;
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

    // Filtra fotos que precisam de classificação (não tem todos os campos)
    const photosNeedingAI = photos.filter(p => {
      const hasFrente = p.existingFrente && p.existingFrente !== 'NAO_INFORMADO';
      const hasCategoria = p.existingCategoria && p.existingCategoria !== 'NAO_INFORMADO';
      const hasServico = p.existingServico && p.existingServico !== 'NAO_INFORMADO';
      return !hasFrente || !hasCategoria || !hasServico;
    });

    if (photosNeedingAI.length === 0) {
      // Todas já classificadas
      const results = photos.map(p => ({
        id: p.id,
        frente: p.existingFrente || 'NAO_INFORMADO',
        categoria: p.existingCategoria || 'NAO_INFORMADO',
        servico: p.existingServico || 'NAO_INFORMADO',
        confidence: 1.0,
      }));
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cria resumo compacto para a IA
    const photoSummaries = photosNeedingAI.map((p, i) => {
      const parts = [`[${i}] id:${p.id}`];
      if (p.folderPath) parts.push(`pasta:"${p.folderPath}"`);
      if (p.filename) parts.push(`arquivo:"${p.filename}"`);
      if (p.ocrText) parts.push(`ocr:"${p.ocrText.substring(0, 150)}"`);
      if (p.existingFrente && p.existingFrente !== 'NAO_INFORMADO') parts.push(`frente:${p.existingFrente}`);
      if (p.existingCategoria && p.existingCategoria !== 'NAO_INFORMADO') parts.push(`categoria:${p.existingCategoria}`);
      if (p.existingServico && p.existingServico !== 'NAO_INFORMADO') parts.push(`servico:${p.existingServico}`);
      return parts.join(' | ');
    }).join('\n');

    // PROMPT FIXO - NÃO ALTERAR
    const systemPrompt = `Você é um classificador técnico de fotos de obras.

Use folderPath, filename e ocrText.

Priorize SEMPRE informações explícitas da pasta.

Escolha SOMENTE valores existentes nas listas fornecidas.

Se não houver certeza, retorne "NAO_INFORMADO" e reduza a confiança.

Retorne APENAS JSON válido, sem texto extra.

## LISTAS DE VALORES PERMITIDOS:

### CATEGORIAS:
${CATEGORIAS.join(', ')}

### SERVICOS:
${SERVICOS.join(', ')}

### FRENTES (exemplos):
- FREE_FLOW_P01 a P25
- BSO_01 a BSO_08  
- PRACA_01 a PRACA_05
- KM_XXX (quilometragem)

## REGRAS:
1. Pasta define = NÃO mudar (maior prioridade)
2. OCR confirma = aumenta confiança
3. Se campo já preenchido (existingXxx), MANTER
4. BC = Bacia Contenção = DRENAGEM
5. Fotos na MESMA pasta = MESMA classificação

## FORMATO DE RESPOSTA:
[
  { "id": "xxx", "frente": "XXX", "categoria": "XXX", "servico": "XXX", "confidence": 0.0 }
]`;

    const userContent = `Classifique estas ${photosNeedingAI.length} fotos:

${photoSummaries}`;

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
        temperature: 0.1,
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

    let aiResults;
    try {
      aiResults = JSON.parse(cleanContent);
    } catch (e) {
      console.error('[classify-batch] Erro parse JSON:', cleanContent.substring(0, 500));
      throw new Error("Resposta da IA não é JSON válido");
    }

    if (!Array.isArray(aiResults)) {
      aiResults = [aiResults];
    }

    // Mapeia resultados por id
    const resultMap = new Map();
    for (const r of aiResults) {
      if (r.id) {
        resultMap.set(r.id, {
          frente: r.frente || 'NAO_INFORMADO',
          categoria: r.categoria || r.disciplina || 'NAO_INFORMADO',
          servico: r.servico || 'NAO_INFORMADO',
          confidence: r.confidence || 0.3,
        });
      }
    }

    // Propaga classificação por pasta (5+ fotos com mesma classificação)
    const folderClassifications = new Map<string, Map<string, number>>();
    for (const photo of photos) {
      const folder = photo.folderPath || '';
      if (!folder) continue;
      
      const result = resultMap.get(photo.id);
      if (!result) continue;
      
      const key = `${result.frente}|${result.categoria}|${result.servico}`;
      if (!folderClassifications.has(folder)) {
        folderClassifications.set(folder, new Map());
      }
      const counts = folderClassifications.get(folder)!;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    // Encontra classificação dominante por pasta (>=5 fotos ou >=70% da pasta)
    const dominantByFolder = new Map<string, { frente: string; categoria: string; servico: string }>();
    for (const [folder, counts] of folderClassifications) {
      let maxCount = 0;
      let dominantKey = '';
      for (const [key, count] of counts) {
        if (count > maxCount) {
          maxCount = count;
          dominantKey = key;
        }
      }
      if (maxCount >= 5 || maxCount >= photos.filter(p => p.folderPath === folder).length * 0.7) {
        const [frente, categoria, servico] = dominantKey.split('|');
        dominantByFolder.set(folder, { frente, categoria, servico });
      }
    }

    // Monta resultado final
    const finalResults = photos.map(p => {
      // Se já tem classificação completa, mantém
      if (p.existingFrente && p.existingFrente !== 'NAO_INFORMADO' &&
          p.existingCategoria && p.existingCategoria !== 'NAO_INFORMADO' &&
          p.existingServico && p.existingServico !== 'NAO_INFORMADO') {
        return {
          id: p.id,
          frente: p.existingFrente,
          categoria: p.existingCategoria,
          servico: p.existingServico,
          confidence: 1.0,
        };
      }

      // Tenta da IA
      const aiResult = resultMap.get(p.id);
      
      // Tenta propagação por pasta
      const folderResult = dominantByFolder.get(p.folderPath || '');
      
      // Mescla: existente > IA > pasta > NAO_INFORMADO
      const frente = 
        (p.existingFrente && p.existingFrente !== 'NAO_INFORMADO' ? p.existingFrente : null) ||
        (aiResult?.frente !== 'NAO_INFORMADO' ? aiResult?.frente : null) ||
        folderResult?.frente ||
        'NAO_INFORMADO';
        
      const categoria = 
        (p.existingCategoria && p.existingCategoria !== 'NAO_INFORMADO' ? p.existingCategoria : null) ||
        (aiResult?.categoria !== 'NAO_INFORMADO' ? aiResult?.categoria : null) ||
        folderResult?.categoria ||
        'NAO_INFORMADO';
        
      const servico = 
        (p.existingServico && p.existingServico !== 'NAO_INFORMADO' ? p.existingServico : null) ||
        (aiResult?.servico !== 'NAO_INFORMADO' ? aiResult?.servico : null) ||
        folderResult?.servico ||
        'NAO_INFORMADO';

      return {
        id: p.id,
        frente,
        categoria,
        servico,
        confidence: aiResult?.confidence || (folderResult ? 0.7 : 0.3),
      };
    });

    console.log(`[classify-batch] ${finalResults.length} fotos processadas`);

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
