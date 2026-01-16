import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OCRRequest {
  imageBase64: string;
  mimeType: string;
}

interface OCREngineResult {
  engine: string;
  text: string;
  confidence: number;
  success: boolean;
  error?: string;
  date?: string | null;
  local?: string | null;
  servico?: string | null;
  disciplina?: string | null;
}

// ========== GOOGLE VISION OCR (Free Tier: 1000/mês) ==========
async function processGoogleVision(imageBase64: string): Promise<OCREngineResult> {
  const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
  
  if (!apiKey) {
    return {
      engine: "google-vision",
      text: "",
      confidence: 0,
      success: false,
      error: "GOOGLE_VISION_API_KEY não configurada"
    };
  }

  try {
    console.log("[Google Vision] Iniciando OCR...");
    
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [
              { type: "TEXT_DETECTION", maxResults: 1 },
              { type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }
            ],
            imageContext: {
              languageHints: ["pt", "en"]
            }
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Google Vision] Erro:", response.status, errorText);
      return {
        engine: "google-vision",
        text: "",
        confidence: 0,
        success: false,
        error: `HTTP ${response.status}`
      };
    }

    const data = await response.json();
    const fullText = data.responses?.[0]?.fullTextAnnotation?.text || 
                     data.responses?.[0]?.textAnnotations?.[0]?.description || "";
    
    console.log("[Google Vision] Texto extraído:", fullText.substring(0, 200));

    return {
      engine: "google-vision",
      text: fullText.trim(),
      confidence: fullText.length > 10 ? 90 : 50,
      success: true
    };

  } catch (error: unknown) {
    console.error("[Google Vision] Erro:", error);
    return {
      engine: "google-vision",
      text: "",
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ========== AZURE COMPUTER VISION OCR (Free Tier: 5000/mês) ==========
async function processAzureOCR(imageBase64: string): Promise<OCREngineResult> {
  const endpoint = Deno.env.get("AZURE_VISION_ENDPOINT");
  const apiKey = Deno.env.get("AZURE_VISION_API_KEY");

  if (!endpoint || !apiKey) {
    return {
      engine: "azure-vision",
      text: "",
      confidence: 0,
      success: false,
      error: "AZURE_VISION_ENDPOINT ou AZURE_VISION_API_KEY não configurada"
    };
  }

  try {
    console.log("[Azure Vision] Iniciando OCR...");

    // Converte base64 para binary
    const binaryData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));

    // Azure Read API (mais precisa que OCR básica)
    const analyzeUrl = `${endpoint}/vision/v3.2/read/analyze?language=pt`;
    
    const analyzeResponse = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/octet-stream"
      },
      body: binaryData
    });

    if (!analyzeResponse.ok) {
      // Fallback para OCR simples
      const ocrUrl = `${endpoint}/vision/v3.2/ocr?language=pt&detectOrientation=true`;
      const ocrResponse = await fetch(ocrUrl, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
          "Content-Type": "application/octet-stream"
        },
        body: binaryData
      });

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        console.error("[Azure Vision] Erro:", ocrResponse.status, errorText);
        return {
          engine: "azure-vision",
          text: "",
          confidence: 0,
          success: false,
          error: `HTTP ${ocrResponse.status}`
        };
      }

      const ocrData = await ocrResponse.json();
      const lines: string[] = [];
      
      for (const region of ocrData.regions || []) {
        for (const line of region.lines || []) {
          const lineText = line.words?.map((w: any) => w.text).join(" ") || "";
          if (lineText.trim()) lines.push(lineText.trim());
        }
      }

      const fullText = lines.join("\n");
      console.log("[Azure Vision OCR] Texto:", fullText.substring(0, 200));

      return {
        engine: "azure-vision",
        text: fullText,
        confidence: fullText.length > 10 ? 85 : 40,
        success: true
      };
    }

    // Read API - precisa polling
    const operationLocation = analyzeResponse.headers.get("Operation-Location");
    if (!operationLocation) {
      throw new Error("Operation-Location não retornado");
    }

    // Poll até completar (max 10 tentativas)
    let result;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      
      const resultResponse = await fetch(operationLocation, {
        headers: { "Ocp-Apim-Subscription-Key": apiKey }
      });
      
      result = await resultResponse.json();
      
      if (result.status === "succeeded") break;
      if (result.status === "failed") throw new Error("Azure Read falhou");
    }

    if (result?.status !== "succeeded") {
      throw new Error("Timeout aguardando Azure Read");
    }

    const lines: string[] = [];
    for (const readResult of result.analyzeResult?.readResults || []) {
      for (const line of readResult.lines || []) {
        if (line.text?.trim()) lines.push(line.text.trim());
      }
    }

    const fullText = lines.join("\n");
    console.log("[Azure Vision Read] Texto:", fullText.substring(0, 200));

    return {
      engine: "azure-vision",
      text: fullText,
      confidence: fullText.length > 10 ? 92 : 50,
      success: true
    };

  } catch (error: unknown) {
    console.error("[Azure Vision] Erro:", error);
    return {
      engine: "azure-vision",
      text: "",
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ========== GEMINI VISION (Lovable AI - análise inteligente) ==========
async function processGeminiVision(imageBase64: string, mimeType: string): Promise<OCREngineResult> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  if (!apiKey) {
    return {
      engine: "gemini-vision",
      text: "",
      confidence: 0,
      success: false,
      error: "LOVABLE_API_KEY não configurada"
    };
  }

  try {
    console.log("[Gemini Vision] Iniciando análise inteligente...");

    const systemPrompt = `Você é um especialista em obras de construção civil e infraestrutura rodoviária.
Analise a imagem em DUAS etapas:

## ETAPA 1 - Extrair TODO texto visível:
- Data e hora (geralmente no canto)
- Local/ponto (ex: "Free Flow P-09", "Km 123")
- Descrição do serviço se escrita
- Coordenadas GPS

## ETAPA 2 - Análise VISUAL (mesmo sem texto):
Identifique visualmente o serviço:
- Escavação/vala → ESCAVACAO_DE_VALA
- Tubos/canos → ASSENTAMENTO_DE_TUBOS  
- Concreto → CONCRETAGEM
- Máquina em terra → MOVIMENTACAO_DE_TERRA
- Limpeza terreno → LIMPEZA_DE_TERRENO
- Brita/pedra → EXECUCAO_DE_BASE
- Asfalto → EXECUCAO_DE_PAVIMENTO
- Pintura faixas → SINALIZACAO_HORIZONTAL
- Placas → IMPLANTACAO_DE_PLACAS
- Drenagem → EXECUCAO_DE_DRENAGEM
- Armação ferro → ARMACAO_DE_ACO
- Forma madeira → EXECUCAO_DE_FORMA
- Grama/jardim → PLANTIO_DE_GRAMA

Retorne APENAS JSON:
{
  "text": "todo texto extraído",
  "date": "DD/MM/YYYY HH:MM ou null",
  "local": "local/ponto ou null",
  "servico": "NOME_DO_SERVICO ou null",
  "disciplina": "DRENAGEM|TERRAPLANAGEM|PAVIMENTACAO|SINALIZACAO|ESTRUTURA|PAISAGISMO ou null",
  "confidence": 0-100
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
                image_url: { url: `data:${mimeType};base64,${imageBase64}` }
              },
              { type: "text", text: "Extraia texto e identifique o serviço desta foto de obra." }
            ]
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Gemini Vision] Erro:", response.status, errorText);
      return {
        engine: "gemini-vision",
        text: "",
        confidence: 0,
        success: false,
        error: `HTTP ${response.status}`
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        engine: "gemini-vision",
        text: "",
        confidence: 0,
        success: false,
        error: "Resposta vazia"
      };
    }

    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanContent);

    console.log("[Gemini Vision] Resultado:", parsed);

    return {
      engine: "gemini-vision",
      text: parsed.text || "",
      confidence: parsed.confidence || 0,
      success: true,
      date: parsed.date,
      local: parsed.local,
      servico: parsed.servico,
      disciplina: parsed.disciplina
    };

  } catch (error: unknown) {
    console.error("[Gemini Vision] Erro:", error);
    return {
      engine: "gemini-vision",
      text: "",
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ========== GROQ LLAMA 3.2 VISION ==========
async function processGroqVision(imageBase64: string): Promise<OCREngineResult> {
  const apiKey = Deno.env.get("GROQ_API_KEY");

  if (!apiKey) {
    return {
      engine: "groq-llama",
      text: "",
      confidence: 0,
      success: false,
      error: "GROQ_API_KEY não configurada"
    };
  }

  try {
    console.log("[Groq Llama 3.2] Iniciando OCR...");

    const systemPrompt = `Você é um especialista em OCR para construção civil. 
Extraia TODO o texto visível na imagem, incluindo:
- Nomes de empresas e fornecedores
- Números de nota fiscal, pedidos, OS
- Datas e horários
- Descrições de materiais e serviços
- Quantidades e valores
- Coordenadas GPS
- Qualquer texto identificável

Retorne APENAS o texto extraído, sem explicações.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.2-90b-vision-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia todo o texto desta imagem." },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
              }
            ]
          }
        ],
        max_tokens: 2048,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Groq Llama 3.2] Erro:", response.status, errorText);
      return {
        engine: "groq-llama",
        text: "",
        confidence: 0,
        success: false,
        error: `HTTP ${response.status}`
      };
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || "";

    console.log("[Groq Llama 3.2] Texto:", extractedText.substring(0, 200));

    return {
      engine: "groq-llama",
      text: extractedText.trim(),
      confidence: extractedText.length > 10 ? 88 : 45,
      success: true
    };

  } catch (error: unknown) {
    console.error("[Groq Llama 3.2] Erro:", error);
    return {
      engine: "groq-llama",
      text: "",
      confidence: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// ========== COMBINAR RESULTADOS ==========
function combineResults(results: OCREngineResult[]): OCREngineResult {
  const successful = results.filter(r => r.success && r.text.length > 0);
  
  if (successful.length === 0) {
    // Retorna o resultado do Gemini mesmo se vazio (tem análise visual)
    const gemini = results.find(r => r.engine === "gemini-vision");
    if (gemini) return gemini;
    
    return {
      engine: "combined",
      text: "",
      confidence: 0,
      success: false,
      error: "Nenhum OCR engine retornou texto"
    };
  }

  // Ordena por confidence
  successful.sort((a, b) => b.confidence - a.confidence);

  // Pega o melhor texto
  const bestText = successful[0].text;
  
  // Pega metadados do Gemini (único que faz análise semântica)
  const geminiResult = results.find(r => r.engine === "gemini-vision" && r.success);

  // Confidence média dos que funcionaram
  const avgConfidence = Math.round(
    successful.reduce((sum, r) => sum + r.confidence, 0) / successful.length
  );

  console.log(`[Multi-OCR] Engines OK: ${successful.map(r => r.engine).join(", ")}`);
  console.log(`[Multi-OCR] Confidence média: ${avgConfidence}`);

  return {
    engine: "combined",
    text: bestText,
    confidence: Math.min(avgConfidence + 5, 100), // Bonus por múltiplos engines
    success: true,
    date: geminiResult?.date || null,
    local: geminiResult?.local || null,
    servico: geminiResult?.servico || null,
    disciplina: geminiResult?.disciplina || null
  };
}

// ========== HANDLER PRINCIPAL ==========
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input: OCRRequest = await req.json();

    if (!input.imageBase64) {
      throw new Error("imageBase64 é obrigatório");
    }

    console.log("[Multi-OCR] Iniciando processamento paralelo...");

    // Executa TODOS os OCR engines em paralelo (incluindo Groq Llama 3.2)
    const [googleResult, azureResult, geminiResult, groqResult] = await Promise.all([
      processGoogleVision(input.imageBase64),
      processAzureOCR(input.imageBase64),
      processGeminiVision(input.imageBase64, input.mimeType || "image/jpeg"),
      processGroqVision(input.imageBase64)
    ]);

    console.log("[Multi-OCR] Resultados:");
    console.log(`  - Google Vision: ${googleResult.success ? "OK" : "ERRO"} (${googleResult.confidence}%)`);
    console.log(`  - Azure Vision: ${azureResult.success ? "OK" : "ERRO"} (${azureResult.confidence}%)`);
    console.log(`  - Gemini Vision: ${geminiResult.success ? "OK" : "ERRO"} (${geminiResult.confidence}%)`);
    console.log(`  - Groq Llama 3.2: ${groqResult.success ? "OK" : "ERRO"} (${groqResult.confidence}%)`);

    // Combina resultados de todos os engines
    const combined = combineResults([googleResult, azureResult, geminiResult, groqResult]);

    return new Response(JSON.stringify({
      text: combined.text,
      confidence: combined.confidence,
      date: combined.date,
      local: combined.local,
      servico: combined.servico,
      disciplina: combined.disciplina,
      engines: {
        google: { success: googleResult.success, confidence: googleResult.confidence },
        azure: { success: azureResult.success, confidence: azureResult.confidence },
        gemini: { success: geminiResult.success, confidence: geminiResult.confidence },
        groq: { success: groqResult.success, confidence: groqResult.confidence }
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[Multi-OCR] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
