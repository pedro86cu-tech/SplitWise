import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { PDFExtract } from 'npm:pdf.js-extract@0.2.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function extractTextFromPdf(pdfBase64: string): Promise<string> {
  console.log('Extracting text from PDF...');

  try {
    const pdfExtract = new PDFExtract();
    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));

    const data = await pdfExtract.extractBuffer(pdfBuffer);

    let fullText = '';
    data.pages.forEach((page: any) => {
      page.content.forEach((item: any) => {
        if (item.str) {
          fullText += item.str + ' ';
        }
      });
      fullText += '\n';
    });

    console.log(`Extracted ${fullText.length} characters from PDF`);
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { image, fileType } = await req.json();

    console.log('=== Processing Receipt Request ===');
    console.log('File type received:', fileType);
    console.log('Image data length:', image ? image.length : 0);

    if (!image) {
      console.error('No image data received');
      return new Response(
        JSON.stringify({ error: 'File data is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const isPDF = fileType && fileType.includes('pdf');
    console.log('Is PDF:', isPDF);

    if (fileType && fileType.includes('doc')) {
      console.log('DOC file detected, returning default values');
      return new Response(
        JSON.stringify({
          type: 'receipt',
          amount: 0,
          description: 'Documento Word - Ingresa los datos manualmente',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured in Supabase environment');
      return new Response(
        JSON.stringify({
          type: 'receipt',
          amount: 0,
          description: 'Gasto escaneado',
          error: 'OPENAI_API_KEY no configurada. Ve a Supabase Dashboard > Project Settings > Edge Functions > Add Secret',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('=== Calling OpenAI API ===');
    console.log('Document type:', isPDF ? 'PDF (text extraction)' : 'Image');

    const systemPrompt = `You are a credit card statement and receipt analyzer. Analyze the document and return ONLY valid JSON with no additional text or explanations.

CRITICAL: Your response must be ONLY the JSON object, nothing else. Do not include markdown code blocks, backticks, or any text before or after the JSON.

CREDIT CARD STATEMENT FORMAT:
If this is a credit card statement with multiple cardholders (like BBVA, Santander, etc.):
{
  "type": "statement",
  "expenses": [
    {
      "cardholder": "FULL NAME AS IT APPEARS",
      "transactions": [
        {
          "amount": 1234.56,
          "description": "Brief description",
          "date": "2025-01-15",
          "currency": "UYU"
        }
      ]
    }
  ]
}

IMPORTANT FOR STATEMENTS:
- Extract cardholder names from sections like "TARJETA XXXX - NAME" or similar headers
- Preserve the EXACT name format from the statement (e.g., "AYALA PEDRO", "ALEJANDRA LONDONO")
- Each transaction must have: amount (number), description (string), date (YYYY-MM-DD), currency (ISO code)
- Common currencies: UYU (Uruguayan Peso), USD (US Dollar), ARS (Argentine Peso), EUR (Euro)
- If you see "$" symbol, determine from document context if it's UYU, USD, or ARS
- For Uruguayan documents with "$" and no other indication, use "UYU"

SINGLE RECEIPT FORMAT:
If this is a single receipt/invoice:
{
  "type": "receipt",
  "amount": 1234.56,
  "description": "Brief description",
  "currency": "UYU"
}

Return ONLY the JSON object.`;

    let messageContent;

    if (isPDF) {
      console.log('Extracting text from PDF...');
      const pdfText = await extractTextFromPdf(image);
      console.log('PDF text extracted, length:', pdfText.length);

      const userPrompt = `Analyze this credit card statement or receipt text. If it's a credit card statement with multiple cardholders, extract all cardholders and their transactions. If it's a single receipt, extract the amount and description. Return ONLY JSON.\n\nDocument text:\n${pdfText}`;

      messageContent = [
        {
          type: 'text',
          text: userPrompt,
        },
      ];
    } else {
      const userPrompt = 'Analyze this image. If it\'s a credit card statement with multiple cardholders, extract all cardholders and their transactions. If it\'s a single receipt, extract the amount and description. Return ONLY JSON.';

      const imageUrl = `data:image/jpeg;base64,${image}`;
      console.log('Image URL format:', imageUrl.substring(0, 50) + '...');

      messageContent = [
        {
          type: 'text',
          text: userPrompt,
        },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
          },
        },
      ];
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: messageContent,
          },
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== OpenAI API Error ===');
      console.error('Status:', response.status);
      console.error('Error text:', errorText);
      throw new Error(`OpenAI API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('=== OpenAI Response ===');
    console.log('Response data:', JSON.stringify(data, null, 2));

    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.error('No content in OpenAI response. Full data:', JSON.stringify(data));
      throw new Error('No content in OpenAI response');
    }

    console.log('=== Parsing Response ===');
    console.log('Raw content length:', content.length);
    console.log('Raw content (first 500 chars):', content.substring(0, 500));
    console.log('Raw content (last 200 chars):', content.substring(Math.max(0, content.length - 200)));

    let result;
    try {
      let cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^[^{]*/g, '')
        .replace(/[^}]*$/g, '')
        .trim();

      console.log('After removing markdown:', cleanContent.substring(0, 200));

      cleanContent = cleanContent
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/\n/g, ' ')
        .replace(/\r/g, '')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/,\s*,/g, ',');

      console.log('Cleaned content (first 500 chars):', cleanContent.substring(0, 500));

      try {
        result = JSON.parse(cleanContent);
        console.log('✅ JSON parsed successfully');
      } catch (firstError) {
        console.log('❌ First parse attempt failed, trying to extract JSON...');
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('Found JSON match, attempting to parse...');
          result = JSON.parse(jsonMatch[0]);
          console.log('✅ JSON extracted and parsed successfully');
        } else {
          console.error('❌ No JSON object found in content');
          throw firstError;
        }
      }

      console.log('Parsed result type:', result.type);
      console.log('Parsed result keys:', Object.keys(result));
      console.log('Full parsed result:', JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error('=== Parse Error ===');
      console.error('❌ Failed to parse OpenAI response');
      console.error('Raw content:', content);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      console.error('Error message:', errorMessage);
      console.error('Error details:', parseError);

      return new Response(
        JSON.stringify({
          type: 'receipt',
          amount: 0,
          description: 'Error al procesar - Ingresa datos manualmente',
          currency: 'USD',
          error: `Error de formato: ${errorMessage}. Revisa los logs en Supabase Dashboard.`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('=== Processing Result ===');
    console.log('Result type:', result.type);

    if (result.type === 'statement' && result.expenses) {
      console.log('Detected credit card statement with', result.expenses.length, 'cardholders');
      console.log('Expenses:', JSON.stringify(result.expenses, null, 2));

      return new Response(
        JSON.stringify({
          type: 'statement',
          expenses: result.expenses,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      console.log('Detected single receipt');
      console.log('Amount:', result.amount);
      console.log('Description:', result.description);
      console.log('Currency:', result.currency);

      return new Response(
        JSON.stringify({
          type: 'receipt',
          amount: result.amount || 0,
          description: result.description || 'Gasto escaneado',
          currency: result.currency || 'USD',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('=== Error Caught ===');
    console.error('Error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al procesar el recibo';
    return new Response(
      JSON.stringify({
        type: 'receipt',
        amount: 0,
        description: 'Gasto escaneado',
        error: errorMessage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});