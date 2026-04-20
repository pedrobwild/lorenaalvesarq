// Generates Portuguese alt-text for an image URL using Lovable AI (Gemini vision).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const imageUrl: string | undefined = body?.imageUrl;
    const context: string | undefined = body?.context;

    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt =
      "Você escreve alt-text em português para fotos de arquitetura e interiores. " +
      "Regras: descreva o que se vê de forma objetiva e visual (ambiente, materiais, luz, composição). " +
      "Máximo 140 caracteres, uma única frase, sem ponto final, sem aspas, sem prefixos como 'Foto de' ou 'Imagem de'. " +
      "Use letras minúsculas no estilo do site. Não invente nomes próprios.";

    const userText = context
      ? `Projeto: ${context}. Gere o alt-text desta imagem.`
      : "Gere o alt-text desta imagem.";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "limite de requisições atingido, tente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "créditos de IA esgotados, adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.error("AI gateway error:", aiResp.status, text);
      return new Response(
        JSON.stringify({ error: "falha ao gerar alt-text" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiResp.json();
    let alt: string =
      data?.choices?.[0]?.message?.content?.toString().trim() ?? "";
    // sanitize
    alt = alt.replace(/^["'`]+|["'`]+$/g, "").replace(/\.$/, "").trim();
    if (alt.length > 160) alt = alt.slice(0, 157).trimEnd() + "…";

    return new Response(JSON.stringify({ alt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    console.error("generate-alt-text error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
