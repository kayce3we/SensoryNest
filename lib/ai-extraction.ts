const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export interface ExtractedActivity {
  name: string;
  description: string;
  sensory_system: string;
  duration: number;
  suggested_time?: string;
}

export async function extractActivitiesFromPDF(
  pdfBase64: string,
  apiKey: string
): Promise<ExtractedActivity[]> {
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: `You are an occupational therapy assistant. Extract all sensory diet activities from this OT plan document.

Return ONLY valid JSON — an array of activity objects with these exact fields:
- name: string (short activity name)
- description: string (1-2 sentence instruction for parents)
- sensory_system: one of "Proprioceptive" | "Tactile" | "Vestibular" | "Auditory" | "Visual" | "Interoceptive"
- duration: number (minutes, estimate if not specified)
- suggested_time: string (e.g. "Morning", "After-school", "Bedtime" — optional)

Example output:
[
  {
    "name": "Weighted blanket squeeze",
    "description": "Use the weighted blanket for deep pressure input before transitions.",
    "sensory_system": "Proprioceptive",
    "duration": 5,
    "suggested_time": "Morning"
  }
]

Extract all activities. Return only the JSON array, no other text.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${err}`);
  }

  const result = await response.json();
  const text = result.content?.[0]?.text ?? '[]';

  // Strip markdown code fences if present
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean) as ExtractedActivity[];
}
