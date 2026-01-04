import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Clean up boilerplate content from scraped markdown
function cleanContent(markdown: string): string {
  const patterns = [
    // Newsletter forms and subscription prompts
    /^#+\s*(Newsletter|Subscribe|Abonnieren|Teilen Sie|Mit dem.*Newsletter).*$/gmi,
    /^\*\*?\[.*Newsletter.*\].*$/gmi,
    /^Phone\s*$/gmi,
    /^E-Mail\(erforderlich\)\s*$/gmi,
    /^Dieses Feld.*$/gmi,
    /^Einwilligung\(erforderlich\).*$/gmi,
    /^Ich stimme der Datenschutz.*$/gmi,
    /^Zum Artikel\s*$/gmi,
    /^\[Zurück zur Startseite\].*$/gmi,
    
    // Social sharing and related articles
    /^#+\s*TEILEN SIE DIESE SEITE.*$/gmi,
    /^- \[Teilen auf.*$/gmi,
    /^- \[Per E-Mail teilen\].*$/gmi,
    /^### DAS KÖNNTE SIE AUCH INTERESSIEREN[\s\S]*?(?=^#|\Z)/gmi,
    /^### SIE MÖCHTEN KEINE INFORMATION VERPASSEN\?[\s\S]*$/gmi,
    
    // Navigation and UI elements
    /^\[Nach oben scrollen.*$/gmi,
    /^Benachrichtigungen\s*$/gmi,
    /^✕\s*$/gmi,
    /^×\s*$/gmi,
    
    // Empty tables
    /^\|\s*\|\s*\|\s*$/gm,
    /^\| --- \| --- \|$/gm,
    
    // Validation fields
    /^confirm list\s*$/gmi,
    /^TK NL\s*$/gmi,
  ];
  
  let cleaned = markdown;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove multiple consecutive empty lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Remove leading/trailing whitespace
  return cleaned.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, options } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured. Please connect Firecrawl in Settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL:', formattedUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: options?.formats || ['markdown'],
        onlyMainContent: true,
        excludeTags: ['nav', 'footer', 'aside', 'form', 'header', '.newsletter', '.social-share', '.related-articles', '.sidebar', '.comments'],
        waitFor: options?.waitFor,
        removeBase64Images: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean the markdown content
    const rawMarkdown = data.data?.markdown || '';
    const cleanedMarkdown = cleanContent(rawMarkdown);
    
    console.log('Scrape successful, raw length:', rawMarkdown.length, 'cleaned length:', cleanedMarkdown.length);
    
    // Return cleaned content
    const cleanedData = {
      ...data,
      data: {
        ...data.data,
        markdown: cleanedMarkdown,
        rawMarkdown: rawMarkdown,
      }
    };
    
    return new Response(
      JSON.stringify(cleanedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
