import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, prompt } = await req.json();

    if (!imageBase64) {
      throw new Error("imageBase64 is required");
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em OCR para construção civil. 
Extraia TODO o texto visível na imagem, incluindo:
- Nomes de empresas e fornecedores
- Números de nota fiscal, pedidos, OS
- Datas
- Descrições de materiais e serviços
- Quantidades e valores
- Qualquer texto identificável

Retorne APENAS o texto extraído, sem explicações.`;

    const userPrompt = prompt || "Extraia todo o texto desta imagem.";

    // Groq usa Llama 3.2 Vision que suporta imagens
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.2-90b-vision-preview",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
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
      console.error("Groq API error:", response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText,
        engine: "groq-llama-3.2-vision",
        model: "llama-3.2-90b-vision-preview",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("OCR Groq error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        engine: "groq-llama-3.2-vision",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
