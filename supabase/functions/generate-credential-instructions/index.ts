import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface GenerateRequest {
  prompt: string;
  credentialName?: string;
}

const SYSTEM_PROMPT = `You are an expert at creating credential instruction flows for a driver compliance platform.

Given a user's plain-text description of what they need, generate a structured JSON instruction configuration.

The output must be valid JSON matching this schema:

{
  "version": 2,
  "settings": {
    "showProgressBar": boolean,
    "allowStepSkip": boolean,
    "completionBehavior": "all_steps" | "required_only",
    "externalSubmissionAllowed": boolean
  },
  "steps": [
    {
      "id": "unique-uuid",
      "order": number,
      "title": "Step Title",
      "type": "information" | "external_action" | "form_input" | "document_upload" | "signature" | "knowledge_check" | "admin_verify",
      "required": boolean,
      "blocks": [...],
      "conditions": [],
      "completion": {
        "type": "auto" | "manual" | "form_submit" | "external_confirm" | "quiz_pass",
        "autoCompleteOnView": boolean (optional)
      }
    }
  ]
}

CRITICAL: Each block MUST have this exact structure:
{
  "id": "unique-uuid-here",
  "order": number,
  "type": "block_type_here",
  "content": { ... content properties based on type ... }
}

Available block types with their "content" properties:

1. heading: content = { "text": string, "level": 1|2|3 }
   Example: { "id": "abc123", "order": 1, "type": "heading", "content": { "text": "Welcome", "level": 1 } }

2. paragraph: content = { "text": string }
   Example: { "id": "def456", "order": 2, "type": "paragraph", "content": { "text": "Please complete the following..." } }

3. alert: content = { "variant": "info"|"warning"|"success"|"error", "title": string, "message": string }

4. file_upload: content = { "label": string, "accept": string (e.g. "image/*,.pdf"), "maxSizeMB": number, "multiple": boolean, "required": boolean, "helpText": string (optional) }

5. signature_pad: content = { "label": string, "required": boolean, "allowTyped": boolean, "allowDrawn": boolean, "agreementText": string (optional) }

6. form_field: content = { "key": string, "label": string, "type": "text"|"number"|"date"|"select"|"textarea"|"checkbox"|"email"|"phone", "required": boolean, "placeholder": string (optional), "helpText": string (optional), "options": [{"value": string, "label": string}] (for select only) }

7. checklist: content = { "title": string (optional), "items": [{"id": string, "text": string, "required": boolean}], "requireAllChecked": boolean }

8. external_link: content = { "url": string, "title": string, "description": string (optional), "buttonText": string, "trackVisit": boolean, "requireVisit": boolean, "opensInNewTab": boolean }

9. divider: content = { "style": "solid"|"dashed"|"dotted" }

10. button: content = { "text": string, "variant": "default"|"outline"|"ghost", "action": "next_step"|"external_url"|"submit", "url": string (optional) }

CRITICAL RULES TO AVOID DUPLICATE LABELS:
- The step title is ALREADY displayed as the main heading to the user. DO NOT add a heading block that repeats or paraphrases the step title.
- For file_upload blocks, use SHORT labels like "Front of License", "Back Photo", "Document" - NOT the full step title again.
- Avoid redundancy: if the step is titled "Upload Drug Screen Document", the file_upload label should just be "Document" or "PDF File", NOT "Drug Screen Document".

Other rules:
- Generate unique UUIDs for each step and block id (use format like "step-1", "block-1-1", etc.)
- Use appropriate step types based on content (document_upload for file uploads, signature for signatures, etc.)
- DO NOT start steps with a heading block. Start with a brief paragraph explaining what to do, or jump straight to the action block.
- Only use heading blocks for sub-sections within complex steps that have multiple unrelated actions.
- Use alert blocks sparingly for important warnings only.
- Set showProgressBar to true if there are 2+ steps
- Order blocks logically
- For document uploads, specify appropriate accept types (e.g., "image/*" for photos, ".pdf" for documents)
- Make steps required by default unless the user says otherwise

ONLY output the JSON object, no markdown, no explanation, just pure JSON.`;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const { prompt, credentialName } = (await req.json()) as GenerateRequest;

    if (!prompt || prompt.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'Please provide a more detailed description (at least 10 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userPrompt = credentialName 
      ? `Create an instruction flow for a credential called "${credentialName}". Here's what it should include:\n\n${prompt}`
      : `Create an instruction flow based on this description:\n\n${prompt}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('Failed to generate instructions');
    }

    const data = await response.json();
    const generatedContent = data.choices[0]?.message?.content;

    if (!generatedContent) {
      throw new Error('No content generated');
    }

    // Parse and validate the JSON
    const instructionConfig = JSON.parse(generatedContent);

    // Basic validation
    if (!instructionConfig.version || !instructionConfig.steps || !Array.isArray(instructionConfig.steps)) {
      throw new Error('Invalid instruction config structure');
    }

    return new Response(
      JSON.stringify({ config: instructionConfig }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating instructions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate instructions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
