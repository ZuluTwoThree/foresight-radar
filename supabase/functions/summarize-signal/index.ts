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

    // Minimum content validation to prevent hallucination
    const MIN_CONTENT_LENGTH = 100;
    if (content.trim().length < MIN_CONTENT_LENGTH) {
      return new Response(
        JSON.stringify({ 
          error: `Content too short. Please provide at least ${MIN_CONTENT_LENGTH} characters for meaningful analysis. Currently: ${content.trim().length} characters.`
        }),
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

    const systemPrompt = `You are a strategic foresight analyst. Analyze the PROVIDED content and extract insights.

CRITICAL ANTI-HALLUCINATION RULES:
1. ONLY use information EXPLICITLY stated in the provided content
2. NEVER invent, assume, or infer facts not present in the source text
3. Do NOT use the URL or title to guess content - analyze only what is given
4. Every statement in your summary must be directly traceable to the source
5. If content is too short or vague to analyze meaningfully, return an error
6. Do NOT make up company names, statistics, dates, or claims not in the text

If content is insufficient for meaningful analysis, respond with:
{"error": "insufficient_content", "message": "The provided content is too vague for meaningful analysis."}

Otherwise, respond with valid JSON matching this schema:
{
  "summary": "string (max 150 words - summarize ONLY what is explicitly stated)",
  "takeaways": ["string", "string", "string"] (3 key points FROM the text only),
  "tags": ["kebab-case"] (2-6 tags derived FROM the content themes),
  "relevance": number (0-100, strategic importance based on stated facts),
  "horizon": "0_5" | "5_10" | "10_plus" (time horizon if mentioned, else "5_10"),
  "certainty": "certain" | "uncertain" | "wildcard" (based on language in source)
}

Guidelines:
- Summary language should match the source content language
- Tags must be lowercase kebab-case English (e.g., "precision-fermentation")
- Relevance considers strategic importance and scope mentioned in the text
- Certainty: "certain" if source uses definitive language, "uncertain" for speculative content, "wildcard" for highly disruptive/unexpected developments`;
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
