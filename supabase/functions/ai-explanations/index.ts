import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExplanationRequest {
  type: 'explanation' | 'feedback';
  questionText: string;
  correctAnswer: string;
  userAnswer?: string;
  studentLevel?: string;
  subject?: string;
  marks?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, questionText, correctAnswer, userAnswer, studentLevel, subject, marks } = await req.json() as ExplanationRequest;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt: string;
    let userPrompt: string;

    if (type === 'explanation') {
      // Generate step-by-step explanation for the correct answer
      systemPrompt = `You are a patient, encouraging Ugandan teacher helping a ${studentLevel || 'primary school'} student understand ${subject || 'a subject'}. 
Your explanations should:
- Be clear and age-appropriate
- Use step-by-step reasoning
- Include encouragement
- Reference local context when helpful (Ugandan shillings, local examples)
- Use simple language
Keep explanations concise but thorough.`;

      userPrompt = `Please explain how to solve this question step by step:

Question: ${questionText}
Correct Answer: ${correctAnswer}
${marks ? `This question is worth ${marks} marks.` : ''}

Provide a clear, step-by-step explanation that a student can follow.`;

    } else {
      // Generate personalized feedback for an incorrect answer
      systemPrompt = `You are a supportive Ugandan teacher helping a ${studentLevel || 'primary school'} student learn from their mistake. 
Your feedback should:
- Be encouraging, not discouraging
- Explain why their answer was incorrect
- Show the correct approach step by step
- Help them understand the concept, not just memorize the answer
- Be brief but helpful`;

      userPrompt = `A student answered this question incorrectly. Please help them understand their mistake.

Question: ${questionText}
Student's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}

First, briefly explain where they went wrong. Then show the correct approach step by step.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content || "Unable to generate explanation.";

    return new Response(JSON.stringify({ explanation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in ai-explanations function:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "An error occurred" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
