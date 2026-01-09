import { neon } from "@neondatabase/serverless";

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

// Bot detection patterns
const BOT_PATTERNS = [
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i,
  /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i, /discordbot/i,
  /python-requests/i, /curl/i, /wget/i, /scrapy/i,
  /bot/i, /crawler/i, /spider/i, /scraper/i,
];

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.trim() === "") return true;
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

export async function initDB() {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS trollornot_analyses (
      id SERIAL PRIMARY KEY,
      conversation_hash TEXT NOT NULL,
      message_count INTEGER,
      participant_count INTEGER,
      platform TEXT,
      overall_score INTEGER,
      verdict TEXT,
      signal_bad_faith INTEGER,
      signal_provocation INTEGER,
      signal_engagement_bait INTEGER,
      signal_strawmanning INTEGER,
      signal_derailing INTEGER,
      llm_enhanced BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      ip_address TEXT,
      user_agent TEXT,
      country TEXT,
      is_bot BOOLEAN DEFAULT FALSE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS trollornot_visitors (
      id SERIAL PRIMARY KEY,
      ip_address TEXT,
      user_agent TEXT,
      country TEXT,
      referrer TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      is_bot BOOLEAN DEFAULT FALSE
    )
  `;
}

export interface AnalysisLog {
  conversationHash: string;
  messageCount: number;
  participantCount: number;
  platform: string;
  overallScore: number;
  verdict: string;
  signalBreakdown: {
    badFaith: number;
    provocation: number;
    engagementBait: number;
    strawmanning: number;
    derailing: number;
  };
  llmEnhanced: boolean;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
}

export async function logAnalysis(data: AnalysisLog) {
  if (!sql) return;

  try {
    const isBotUser = isBot(data.userAgent);

    await sql`
      INSERT INTO trollornot_analyses (
        conversation_hash, message_count, participant_count, platform,
        overall_score, verdict, llm_enhanced,
        signal_bad_faith, signal_provocation, signal_engagement_bait,
        signal_strawmanning, signal_derailing,
        ip_address, user_agent, country, is_bot
      ) VALUES (
        ${data.conversationHash},
        ${data.messageCount},
        ${data.participantCount},
        ${data.platform},
        ${data.overallScore},
        ${data.verdict},
        ${data.llmEnhanced},
        ${data.signalBreakdown.badFaith},
        ${data.signalBreakdown.provocation},
        ${data.signalBreakdown.engagementBait},
        ${data.signalBreakdown.strawmanning},
        ${data.signalBreakdown.derailing},
        ${data.ipAddress || null},
        ${data.userAgent || null},
        ${data.country || null},
        ${isBotUser}
      )
    `;
  } catch (error) {
    console.error("Failed to log analysis:", error);
  }
}

export interface VisitorLog {
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  referrer?: string;
}

export async function logVisitor(data: VisitorLog) {
  if (!sql) return;

  try {
    const isBotUser = isBot(data.userAgent);
    await sql`
      INSERT INTO trollornot_visitors (ip_address, user_agent, country, referrer, is_bot)
      VALUES (${data.ipAddress || null}, ${data.userAgent || null}, ${data.country || null}, ${data.referrer || null}, ${isBotUser})
    `;
  } catch (error) {
    console.error("Failed to log visitor:", error);
  }
}

export async function isDBAvailable(): Promise<boolean> {
  if (!sql) return false;
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// Simple hash function for conversation deduplication
export function hashConversation(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
