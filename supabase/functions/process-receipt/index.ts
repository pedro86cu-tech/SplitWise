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

    // Check if it's a PDF document
    const isPDF = fileType && fileType.includes('pdf');
    console.log('Is PDF:', isPDF);

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

    console.log('=== Calling OpenAI API ===');
    console.log('Document type:', isPDF ? 'PDF' : 'Image');

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

    const imageUrl = isPDF
      ? `data:application/pdf;base64,${image}`
      : `data:image/jpeg;base64,${image}`;

    console.log('Image URL format:', imageUrl.substring(0, 50) + '...');

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
                  url: imageUrl,
                },
              },
            ],
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
    console.log('Raw content:', content);

    let result;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      console.log('Cleaned content:', cleanContent);
      result = JSON.parse(cleanContent);
      console.log('Parsed result:', JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error('=== Parse Error ===');
      console.error('Failed to parse OpenAI response:', content);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      console.error('Error message:', errorMessage);
      throw new Error(`Failed to parse OpenAI response: ${errorMessage}`);
    }

    // Handle different response types
    console.log('=== Processing Result ===');
    console.log('Result type:', result.type);

    if (result.type === 'statement' && result.expenses) {
      console.log('Detected credit card statement with', result.expenses.length, 'cardholders');
      console.log('Expenses:', JSON.stringify(result.expenses, null, 2));

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
      console.log('Detected single receipt');
      console.log('Amount:', result.amount);
      console.log('Description:', result.description);

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
