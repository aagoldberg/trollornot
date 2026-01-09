import Anthropic from "@anthropic-ai/sdk";
import { SignalBreakdown, Verdict } from "./score";
import { ParsedMessage } from "./parser";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Extract conversation text from a screenshot using Claude Vision
export async function extractConversationFromImage(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
): Promise<{ success: boolean; text?: string; error?: string }> {
  if (!client) {
    return { success: false, error: "AI not available for image processing" };
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Extract the conversation from this screenshot. Output ONLY the conversation text in a clean format like:

Username: message text
Username: message text

Rules:
- Include all messages visible in the screenshot
- Preserve the original usernames/handles exactly as shown
- Include timestamps if visible (in brackets before the message)
- Don't add any commentary, headers, or explanations
- If this is not a conversation/chat screenshot, respond with: NOT_A_CONVERSATION

Output the raw conversation text only:`,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return { success: false, error: "Unexpected response format" };
    }

    const text = content.text.trim();

    if (text === "NOT_A_CONVERSATION" || text.includes("NOT_A_CONVERSATION")) {
      return { success: false, error: "This doesn't appear to be a conversation screenshot" };
    }

    return { success: true, text };
  } catch (error) {
    console.error("Image extraction failed:", error);
    return { success: false, error: "Failed to process image" };
  }
}

export interface LLMAnalysis {
  adjustedScore: number;
  adjustedVerdict: Verdict;
  reasoning: string[];
  recommendation: string;
  contextNotes?: string;
  flaggedUserAnalysis?: { author: string; assessment: string }[];
}

const SYSTEM_PROMPT = `You are an expert at detecting trolling behavior in online conversations. Your job is to analyze chat logs and identify patterns of trolling, bad faith engagement, and provocation.

You are NOT judging opinions or political views. You detect BEHAVIOR PATTERNS regardless of the topic being discussed.

Key trolling indicators:
1. **Bad Faith**: Sealioning (endless "just asking questions"), moving goalposts, feigning ignorance, never actually engaging with responses
2. **Provocation**: Intentionally inflammatory language, seeking emotional reactions over discussion ("cope", "seethe", "cry more", insults)
3. **Engagement Bait**: Performative responses designed to provoke ("ratio", "L", "who asked"), not genuine engagement
4. **Strawmanning**: Deliberately misrepresenting others' positions ("so you're saying...", "you people")
5. **Derailing**: Topic hijacking, whataboutism, deflection from the actual discussion

IMPORTANT CONTEXT:
- Friends using casual language with each other is NOT trolling
- Genuine disagreement, even heated, is NOT trolling
- Strong opinions are NOT trolling
- One rude message doesn't make someone a troll - look for PATTERNS
- Sarcasm in context is NOT trolling
- The key question: Is this person trying to have a conversation, or trying to provoke a reaction?

Respond in JSON format only.`;

interface AnalysisRequest {
  messages: ParsedMessage[];
  ruleBasedScore: number;
  ruleBasedVerdict: Verdict;
  signalBreakdown: SignalBreakdown;
  flaggedUsers: { author: string; avgScore: number; messageCount: number }[];
}

export async function enhanceWithLLM(
  request: AnalysisRequest
): Promise<LLMAnalysis | null> {
  if (!client) {
    return null;
  }

  // Format conversation for LLM
  const conversationText = request.messages
    .map((m) => `[${m.author}]: ${m.content}`)
    .join("\n\n");

  // Truncate if needed
  const truncatedConversation =
    conversationText.length > 4000
      ? conversationText.substring(0, 4000) + "\n\n[...truncated...]"
      : conversationText;

  // Build context about rule-based findings
  const ruleContext = `
Rule-based analysis found:
- Bad Faith: ${request.signalBreakdown.badFaith}/100
- Provocation: ${request.signalBreakdown.provocation}/100
- Engagement Bait: ${request.signalBreakdown.engagementBait}/100
- Strawmanning: ${request.signalBreakdown.strawmanning}/100
- Derailing: ${request.signalBreakdown.derailing}/100
- Overall score: ${request.ruleBasedScore}/100 (${request.ruleBasedVerdict})

${
  request.flaggedUsers.length > 0
    ? `Flagged users: ${request.flaggedUsers
        .map((u) => `@${u.author} (avg ${u.avgScore}, ${u.messageCount} msgs)`)
        .join(", ")}`
    : "No users flagged by rules"
}`;

  const userPrompt = `Analyze this conversation for trolling behavior:

CONVERSATION:
${truncatedConversation}

${ruleContext}

Consider:
1. Is anyone in this conversation acting in bad faith?
2. Is the flagged language genuine frustration vs. deliberate provocation?
3. Are there patterns the rules missed (or false positives)?
4. What's the likely intent of each participant?

Respond with this exact JSON structure:
{
  "adjustedScore": <number 0-100, may adjust rule score based on context>,
  "adjustedVerdict": "<genuine|suspicious|trolling>",
  "reasoning": ["<3-5 concise observations about the conversation>"],
  "recommendation": "<1-2 sentence advice for how to respond>",
  "contextNotes": "<optional: explain if rule score was misleading>",
  "flaggedUserAnalysis": [{"author": "<username>", "assessment": "<brief assessment>"}]
}`;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return null;
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate verdict
    const validVerdicts: Verdict[] = ["genuine", "suspicious", "trolling"];
    const adjustedVerdict = validVerdicts.includes(parsed.adjustedVerdict)
      ? parsed.adjustedVerdict
      : request.ruleBasedVerdict;

    return {
      adjustedScore: Math.min(100, Math.max(0, parsed.adjustedScore)),
      adjustedVerdict,
      reasoning: parsed.reasoning || [],
      recommendation:
        parsed.recommendation || "Consider the context before responding.",
      contextNotes: parsed.contextNotes,
      flaggedUserAnalysis: parsed.flaggedUserAnalysis,
    };
  } catch (error) {
    console.error("LLM analysis failed:", error);
    return null;
  }
}

export function isLLMAvailable(): boolean {
  return client !== null;
}
