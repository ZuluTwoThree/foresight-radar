import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SummarizeRequest {
  content: string;
  title?: string;
  url?: string;
}

interface SummarizeResponse {
  summary: string;
  takeaways: string[];
  tags: string[];
  relevance: number;
  horizon: "0_5" | "5_10" | "10_plus";
  certainty: "certain" | "uncertain" | "wildcard";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, title, url }: SummarizeRequest = await req.json();

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a strategic foresight analyst. Your task is to analyze content and extract key insights for trend analysis.

You MUST respond with valid JSON matching this exact schema:
{
  "summary": "string (max 150 words, concise summary of the key points)",
  "takeaways": ["string", "string", "string"] (exactly 3 bullet-point takeaways),
  "tags": ["kebab-case-tag"] (2-6 lowercase kebab-case tags describing themes),
  "relevance": number (0-100, how relevant this is for strategic foresight),
  "horizon": "0_5" | "5_10" | "10_plus" (time horizon: 0-5 years, 5-10 years, or 10+ years),
  "certainty": "certain" | "uncertain" | "wildcard" (how certain is this development)
}

Guidelines:
- Summary should be in the same language as the source content
- Tags should be in English and lowercase kebab-case (e.g., "artificial-intelligence", "sustainability")
- Relevance considers strategic importance, disruptiveness, and scope of impact
- Horizon considers when this trend will have significant impact
- Certainty: "certain" for established trends, "uncertain" for emerging patterns, "wildcard" for speculative developments`;

    const userPrompt = `Analyze this content for strategic foresight:

${title ? `Title: ${title}\n` : ""}${url ? `Source URL: ${url}\n` : ""}
Content:
${content.substring(0, 8000)}

Respond with JSON only, no additional text.`;

    console.log("Calling Lovable AI for summarization...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response
    let parsed: SummarizeResponse;
    try {
      // Clean up potential markdown code blocks
      const cleanContent = aiContent.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and sanitize response
    const result: SummarizeResponse = {
      summary: String(parsed.summary || "").substring(0, 1200),
      takeaways: Array.isArray(parsed.takeaways) 
        ? parsed.takeaways.slice(0, 3).map(t => String(t))
        : ["Key insight 1", "Key insight 2", "Key insight 3"],
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.slice(0, 6).map(t => String(t).toLowerCase().replace(/\s+/g, "-"))
        : ["unclassified"],
      relevance: Math.min(100, Math.max(0, Number(parsed.relevance) || 50)),
      horizon: ["0_5", "5_10", "10_plus"].includes(parsed.horizon) 
        ? parsed.horizon 
        : "5_10",
      certainty: ["certain", "uncertain", "wildcard"].includes(parsed.certainty)
        ? parsed.certainty
        : "uncertain",
    };

    console.log("Summarization complete:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in summarize-signal function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
