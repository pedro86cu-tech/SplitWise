import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { image, fileType } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'File data is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if it's a PDF document
    const isPDF = fileType && fileType.includes('pdf');

    // DOC files are not supported
    if (fileType && fileType.includes('doc') && !isPDF) {
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

    console.log('Calling OpenAI API for document processing...');

    // Determine the prompt based on whether it's a PDF or image
    const systemPrompt = isPDF
      ? `You are a credit card statement and receipt analyzer.
         First, determine if this is a credit card statement with multiple cardholders or a single receipt.

         For CREDIT CARD STATEMENTS with multiple cardholders:
         - Return: {"type": "statement", "expenses": [{"cardholder": "Name", "transactions": [{"amount": number, "description": "string", "date": "YYYY-MM-DD"}]}]}
         - Extract the cardholder name from sections like "TARJETA XXXX - NAME"
         - For each cardholder, list their transactions with amount, description, and date
         - Use the original currency (convert if needed, use peso sign $ for pesos and U$S or USD for dollars)

         For SINGLE RECEIPTS:
         - Return: {"type": "receipt", "amount": number, "description": "string"}
         - Extract the total amount and brief description

         Return ONLY valid JSON, no additional text.`
      : 'You are a receipt analyzer. Extract the total amount and a brief description from receipts. Return ONLY valid JSON: {"type": "receipt", "amount": number, "description": "string"}. If you cannot find the total, return 0 for amount.';

    const userPrompt = isPDF
      ? 'Analyze this document. If it\'s a credit card statement with multiple cardholders, extract all cardholders and their transactions. If it\'s a single receipt, extract the amount and description. Return ONLY JSON.'
      : 'Extract the total amount and description from this receipt. Return ONLY JSON format: {"type": "receipt", "amount": number, "description": string}. Do not include any other text.';

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
            content: [
              {
                type: 'text',
                text: userPrompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: isPDF
                    ? `data:application/pdf;base64,${image}`
                    : `data:image/jpeg;base64,${image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', JSON.stringify(data));

    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    let result;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      throw new Error(`Failed to parse OpenAI response: ${errorMessage}`);
    }

    // Handle different response types
    if (result.type === 'statement' && result.expenses) {
      // Credit card statement with multiple cardholders
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
      // Single receipt
      return new Response(
        JSON.stringify({
          type: 'receipt',
          amount: result.amount || 0,
          description: result.description || 'Gasto escaneado',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Error processing receipt:', error);
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
