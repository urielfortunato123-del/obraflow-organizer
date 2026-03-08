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
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY não configurada");
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
        frente: p.existingFrente || '',
        categoria: p.existingCategoria || '',
        servico: p.existingServico || '',
        mode: 'AUTO' as const,
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
      if (p.dateIso) parts.push(`data:${p.dateIso}`);
      if (p.existingFrente && p.existingFrente !== 'NAO_INFORMADO') parts.push(`frente:${p.existingFrente}`);
      if (p.existingCategoria && p.existingCategoria !== 'NAO_INFORMADO') parts.push(`categoria:${p.existingCategoria}`);
      if (p.existingServico && p.existingServico !== 'NAO_INFORMADO') parts.push(`servico:${p.existingServico}`);
      return parts.join(' | ');
    }).join('\n');

    // PROMPT OFICIAL - REGRAS ANTI-NULL - GENÉRICO PARA QUALQUER OBRA
    const systemPrompt = `Você é um classificador estrito de fotos de obra de construção civil e infraestrutura.
Você recebe filename, folderPath, ocrText e date.

## REGRAS OBRIGATÓRIAS:

1. Você NÃO pode inventar categorias. Escolha APENAS entre as listas oficiais:
   - CATEGORIAS: ${CATEGORIAS.join(', ')}
   - SERVICOS: ${SERVICOS.join(', ')}
   - FRENTES: Extraia do caminho da pasta/arquivo. Padrões aceitos:
     * FREE_FLOW_PXX (ex: FREE_FLOW_P09)
     * BSO_XX (ex: BSO_01)
     * PRACA_XX (ex: PRACA_01)
     * KM_XXX ou KM_XXX_XXX (ex: KM_070, KM_070_080)
     * LOTE_XX ou LOTE_X (ex: LOTE_01, LOTE_A)
     * TRECHO_XX (ex: TRECHO_01)
     * ESTACA_XXXX (ex: ESTACA_120)
     * CANTEIRO_OBRAS, CANTEIRO_CENTRAL, CANTEIRO_XX
     * PONTE_XX, VIADUTO_XX
     * PISTA_NORTE, PISTA_SUL, SENTIDO_CAPITAL, SENTIDO_INTERIOR
     * Qualquer local identificável no caminho (normalizado em MAIÚSCULAS com underscores)

2. Se não houver evidência suficiente para preencher os 3 campos com segurança, NÃO preencha parcialmente.

3. Retorne um campo "mode":
   - "AUTO": quando frente, categoria e servico forem selecionados com segurança
   - "ROUTINE": quando NÃO dá para definir frente/categoria/servico, mas há data + local
   - "UNIDENTIFIED": identificação incompleta ou sem evidência

4. Confiança (confidence): número 0..1.

5. Se mode "ROUTINE" ou "UNIDENTIFIED", deixe frente/categoria/servico como "".

6. Se campo já preenchido (existingXxx), MANTER o valor.

7. DICAS DE CONTEXTO:
   - BC = Bacia Contenção = DRENAGEM
   - BL = Bloco = ESTRUTURA
   - PAV = PAVIMENTACAO
   - SIN = SINALIZACAO
   - EST = ESTRUTURA
   - Fotos na MESMA pasta = geralmente MESMA classificação

## FORMATO DE RESPOSTA (JSON por foto):
{
  "id": "...",
  "frente": "",
  "categoria": "",
  "servico": "",
  "mode": "AUTO|ROUTINE|UNIDENTIFIED",
  "confidence": 0.0,
  "locationHint": "KM_070" // opcional: evidência de local encontrada
}

NUNCA retornar null/undefined. NUNCA criar novas categorias.
Retorne APENAS JSON válido, sem texto extra.`;

    const userContent = `Classifique estas ${photosNeedingAI.length} fotos:

${photoSummaries}`;

    console.log('[classify-batch] Chamando Google AI Studio...');

    const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 16000,
        },
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
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    // Limpa markdown
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    console.log('[classify-batch] Resposta recebida, tamanho:', cleanContent.length);

    let aiResults;
    try {
      aiResults = JSON.parse(cleanContent);
    } catch (e) {
      // Tenta recuperar JSON truncado
      console.warn('[classify-batch] JSON inválido, tentando recuperar...');
      
      // Tenta encontrar o último objeto completo
      let recoveredContent = cleanContent;
      
      // Se começa com [ mas não termina com ], tenta fechar
      if (recoveredContent.startsWith('[') && !recoveredContent.endsWith(']')) {
        // Encontra o último } completo
        const lastBrace = recoveredContent.lastIndexOf('}');
        if (lastBrace > 0) {
          recoveredContent = recoveredContent.substring(0, lastBrace + 1) + ']';
          console.log('[classify-batch] Tentando recuperar até posição:', lastBrace);
        }
      }
      
      try {
        aiResults = JSON.parse(recoveredContent);
        console.log('[classify-batch] JSON recuperado com sucesso!');
      } catch (e2) {
        // Última tentativa: extrai objetos individuais com regex
        const objectMatches = cleanContent.match(/\{[^{}]*"id"\s*:\s*"[^"]+[^{}]*\}/g);
        if (objectMatches && objectMatches.length > 0) {
          console.log('[classify-batch] Recuperando', objectMatches.length, 'objetos via regex');
          aiResults = objectMatches.map((m: string) => {
            try { return JSON.parse(m); } catch { return null; }
          }).filter(Boolean);
        } else {
          console.error('[classify-batch] Erro parse JSON irrecuperável:', cleanContent.substring(0, 500));
          // Retorna resultados vazios ao invés de erro
          aiResults = [];
        }
      }
    }

    if (!Array.isArray(aiResults)) {
      aiResults = [aiResults];
    }
    
    console.log('[classify-batch] Resultados parseados:', aiResults.length);

    // Mapeia resultados por id - SANITIZA valores
    const resultMap = new Map();
    for (const r of aiResults) {
      if (r.id) {
        // Sanitiza: null/undefined/"null"/"undefined" -> ""
        const sanitize = (v: any) => {
          if (v === null || v === undefined) return '';
          const s = String(v).trim();
          if (s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined' || s === 'NAO_INFORMADO') return '';
          return s;
        };
        
        resultMap.set(r.id, {
          frente: sanitize(r.frente),
          categoria: sanitize(r.categoria) || sanitize(r.disciplina),
          servico: sanitize(r.servico),
          mode: r.mode || 'UNIDENTIFIED',
          confidence: typeof r.confidence === 'number' ? r.confidence : 0.3,
          locationHint: sanitize(r.locationHint),
        });
      }
    }

    // Propaga classificação por pasta (5+ fotos com mesma classificação)
    const folderClassifications = new Map<string, Map<string, number>>();
    for (const photo of photos) {
      const folder = photo.folderPath || '';
      if (!folder) continue;
      
      const result = resultMap.get(photo.id);
      if (!result || result.mode !== 'AUTO') continue;
      
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

    // Monta resultado final - NUNCA retorna null/undefined
    const finalResults = photos.map(p => {
      // Se já tem classificação completa, mantém como AUTO
      const existingFrente = (p.existingFrente && p.existingFrente !== 'NAO_INFORMADO') ? p.existingFrente : '';
      const existingCategoria = (p.existingCategoria && p.existingCategoria !== 'NAO_INFORMADO') ? p.existingCategoria : '';
      const existingServico = (p.existingServico && p.existingServico !== 'NAO_INFORMADO') ? p.existingServico : '';
      
      if (existingFrente && existingCategoria && existingServico) {
        return {
          id: p.id,
          frente: existingFrente,
          categoria: existingCategoria,
          servico: existingServico,
          mode: 'AUTO' as const,
          confidence: 1.0,
          locationHint: '',
        };
      }

      // Tenta da IA
      const aiResult = resultMap.get(p.id);
      
      // Tenta propagação por pasta
      const folderResult = dominantByFolder.get(p.folderPath || '');
      
      // Mescla: existente > IA > pasta > ""
      const frente = existingFrente || aiResult?.frente || folderResult?.frente || '';
      const categoria = existingCategoria || aiResult?.categoria || folderResult?.categoria || '';
      const servico = existingServico || aiResult?.servico || folderResult?.servico || '';
      
      // Determina mode baseado no resultado
      let mode: 'AUTO' | 'ROUTINE' | 'UNIDENTIFIED' = aiResult?.mode || 'UNIDENTIFIED';
      
      // Se conseguiu preencher tudo via propagação de pasta, é AUTO
      if (frente && categoria && servico && folderResult) {
        mode = 'AUTO';
      }

      return {
        id: p.id,
        frente,
        categoria,
        servico,
        mode,
        confidence: aiResult?.confidence || (folderResult ? 0.7 : 0.3),
        locationHint: aiResult?.locationHint || '',
      };
    });

    console.log(`[classify-batch] ${finalResults.length} fotos processadas`);
    
    // Log de estatísticas
    const autoCount = finalResults.filter(r => r.mode === 'AUTO').length;
    const routineCount = finalResults.filter(r => r.mode === 'ROUTINE').length;
    const unidCount = finalResults.filter(r => r.mode === 'UNIDENTIFIED').length;
    console.log(`[classify-batch] Estatísticas: AUTO=${autoCount}, ROUTINE=${routineCount}, UNIDENTIFIED=${unidCount}`);

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
