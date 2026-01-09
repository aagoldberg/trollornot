import { NextRequest, NextResponse } from "next/server";
import { parseConversation, ParsedMessage } from "@/lib/parser";
import { scoreConversation, SignalBreakdown, Verdict, MessageScoreResult } from "@/lib/score";
import { enhanceWithLLM, isLLMAvailable } from "@/lib/llm";
import { logAnalysis, hashConversation } from "@/lib/db";

export interface MessageAnalysis {
  id: string;
  author: string;
  content: string;
  timestamp?: string;
  score: number;
  verdict: Verdict;
  signals: SignalBreakdown;
  highlights: { start: number; end: number; category: string; text: string }[];
}

export interface AnalyzeResponse {
  success: boolean;
  error?: string;
  overallScore?: number;
  verdict?: Verdict;
  messages?: MessageAnalysis[];
  aggregateSignals?: SignalBreakdown;
  flaggedUsers?: { author: string; avgScore: number; messageCount: number }[];
  patterns?: string[];
  recommendation?: string;
  reasoning?: string[];
  platform?: string;
  participantCount?: number;
  llmEnhanced?: boolean;
  contextNotes?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  try {
    const body = await request.json();
    const { conversation } = body;

    // Capture visitor info
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;
    const country = request.headers.get("x-vercel-ip-country") || null;

    if (!conversation || typeof conversation !== "string") {
      return NextResponse.json(
        { success: false, error: "Conversation text is required" },
        { status: 400 }
      );
    }

    if (conversation.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "Conversation is too short to analyze" },
        { status: 400 }
      );
    }

    // Parse the conversation
    const parsed = parseConversation(conversation);

    if (parsed.messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Could not parse any messages from the input" },
        { status: 422 }
      );
    }

    // Score the conversation
    const scoreResult = scoreConversation(parsed.messages);

    // Build message analyses
    const messageAnalyses: MessageAnalysis[] = parsed.messages.map((msg) => {
      const result = scoreResult.messageResults.get(msg.id) as MessageScoreResult;
      return {
        id: msg.id,
        author: msg.author,
        content: msg.content,
        timestamp: msg.timestamp,
        score: result?.score || 0,
        verdict: result?.verdict || "genuine",
        signals: result?.signals || {
          badFaith: 0,
          provocation: 0,
          engagementBait: 0,
          strawmanning: 0,
          derailing: 0,
        },
        highlights: result?.highlights || [],
      };
    });

    // Prepare response with rule-based results
    let finalScore = scoreResult.overallScore;
    let finalVerdict = scoreResult.verdict;
    let recommendation = getDefaultRecommendation(finalVerdict);
    let reasoning: string[] = [];
    let llmEnhanced = false;
    let contextNotes: string | undefined;

    // Try to enhance with LLM
    if (isLLMAvailable()) {
      const llmResult = await enhanceWithLLM({
        messages: parsed.messages,
        ruleBasedScore: scoreResult.overallScore,
        ruleBasedVerdict: scoreResult.verdict,
        signalBreakdown: scoreResult.aggregateSignals,
        flaggedUsers: scoreResult.flaggedUsers,
      });

      if (llmResult) {
        finalScore = llmResult.adjustedScore;
        finalVerdict = llmResult.adjustedVerdict;
        recommendation = llmResult.recommendation;
        reasoning = llmResult.reasoning;
        contextNotes = llmResult.contextNotes;
        llmEnhanced = true;
      }
    }

    // Generate patterns from rule analysis if LLM didn't provide reasoning
    if (reasoning.length === 0 && scoreResult.patterns.length > 0) {
      reasoning = scoreResult.patterns;
    }

    // Log the analysis
    logAnalysis({
      conversationHash: hashConversation(conversation),
      messageCount: parsed.messages.length,
      participantCount: parsed.participantCount,
      platform: parsed.platform,
      overallScore: finalScore,
      verdict: finalVerdict,
      signalBreakdown: scoreResult.aggregateSignals,
      llmEnhanced,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
      country: country || undefined,
    });

    return NextResponse.json({
      success: true,
      overallScore: finalScore,
      verdict: finalVerdict,
      messages: messageAnalyses,
      aggregateSignals: scoreResult.aggregateSignals,
      flaggedUsers: scoreResult.flaggedUsers,
      patterns: scoreResult.patterns,
      recommendation,
      reasoning,
      platform: parsed.platform,
      participantCount: parsed.participantCount,
      llmEnhanced,
      contextNotes,
    });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

function getDefaultRecommendation(verdict: Verdict): string {
  switch (verdict) {
    case "genuine":
      return "This conversation appears to be genuine engagement. Feel free to continue the discussion.";
    case "suspicious":
      return "Some patterns suggest potential trolling. Proceed with caution and don't feed into provocation.";
    case "trolling":
      return "This conversation shows strong trolling patterns. Consider disengaging - don't feed the troll.";
  }
}
