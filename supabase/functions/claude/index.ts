import { createClient } from 'jsr:@supabase/supabase-js@2';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function callClaude(body: unknown): Promise<string> {
  const res = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Never surface the upstream body — it can echo request details.
    throw new Error(`Claude request failed (${res.status})`);
  }

  const result = await res.json();
  const text = result.content?.[0]?.text ?? '';
  if (!text) throw new Error('Claude returned an empty response.');
  return text;
}

function suggestBody(prompt: string, context: Record<string, unknown>) {
  const contextLines = [
    context.childAge ? `Child's age: ${context.childAge}` : '',
    context.childNotes ? `Sensory needs/notes: ${context.childNotes}` : '',
    context.otNotes ? `OT recommendations: ${context.otNotes}` : '',
    Array.isArray(context.sensoryOrder) && context.sensoryOrder.length
      ? `Preferred sensory order: ${(context.sensoryOrder as string[]).join(' → ')}`
      : '',
  ].filter(Boolean).join('\n');

  return {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are an occupational therapy assistant helping parents find sensory diet activities for their child.

${contextLines ? `Child profile:\n${contextLines}\n` : ''}
Parent's request: "${prompt}"

- Each activity must be ONE single focused action — no sequences, no multi-step routines, no "full programs"
- Do not combine multiple activities into one entry

Suggest 2-3 sensory diet activities that fit this request and the child's profile. Return ONLY valid JSON — an array of activity objects:
[
  {
    "name": "string (short activity name)",
    "description": "string (1-2 sentence instruction for parents)",
    "sensory_system": "Proprioceptive" | "Tactile" | "Vestibular" | "Auditory" | "Visual" | "Interoceptive",
    "duration": number (minutes)
  }
]

Return only the JSON array, no other text.`,
    }],
  };
}

function extractBody(pdfBase64: string) {
  return {
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
        },
        {
          type: 'text',
          text: `You are an occupational therapy assistant. Extract all sensory diet activities from this OT plan document.

Return ONLY valid JSON with this exact shape:
{
  "ot_summary": "2-3 sentence summary of the OT's key recommendations for parents — focus on priorities, timing guidance, and any important notes (e.g. 'Prioritize proprioceptive input before school. Heavy work activities should follow meals. Avoid screen time within 30 minutes of vestibular activities.')",
  "sensory_order": ["Proprioceptive", "Vestibular", "Tactile"],
  "activities": [
    {
      "name": "string (short activity name)",
      "description": "string (1-2 sentence instruction for parents)",
      "sensory_system": "Proprioceptive" | "Tactile" | "Vestibular" | "Auditory" | "Visual" | "Interoceptive",
      "duration": number (minutes, estimate if not specified),
      "suggested_time": "Morning" | "After-school" | "Bedtime" (optional)
    }
  ]
}

For "sensory_order": look for any recommended sequencing in the plan (e.g. "start with heavy work, then vestibular"). Only include systems that the OT explicitly sequences — omit systems with no ordering guidance. Use only these values: "Proprioceptive", "Tactile", "Vestibular", "Auditory", "Visual", "Interoceptive". Return an empty array if no order is specified.

Return only the JSON object, no other text.`,
        },
      ],
    }],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Not signed in.' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Not signed in.' }, 401);

    const { action, prompt, context, pdfBase64 } = await req.json();

    if (action === 'suggest') {
      if (!prompt?.trim()) return json({ error: 'Missing prompt.' }, 400);
      const text = await callClaude(suggestBody(prompt, context ?? {}));
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const match = clean.match(/\[[\s\S]*\]/);
      if (!match) return json({ error: 'No suggestions found in response.' }, 502);
      return json({ activities: JSON.parse(match[0]) });
    }

    if (action === 'extract') {
      if (!pdfBase64) return json({ error: 'Missing file.' }, 400);
      const text = await callClaude(extractBody(pdfBase64));
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const match = clean.match(/\{[\s\S]*\}/);
      if (!match) return json({ error: 'No data found in response.' }, 502);
      const parsed = JSON.parse(match[0]);
      return json({
        activities: parsed.activities ?? [],
        otSummary: parsed.ot_summary ?? '',
        sensoryOrder: parsed.sensory_order ?? [],
      });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Request failed.' }, 500);
  }
});
