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

// Dashboard Stats
export interface DashboardStats {
  totalAnalyses: number;
  todayAnalyses: number;
  weekAnalyses: number;
  avgScore: number;
  verdictDistribution: { genuine: number; suspicious: number; trolling: number };
  platformBreakdown: Record<string, number>;
  signalAverages: {
    badFaith: number;
    provocation: number;
    engagementBait: number;
    strawmanning: number;
    derailing: number;
  };
  successRate: number;
  llmEnhancedRate: number;
  botStats: {
    totalBots: number;
    totalHumans: number;
    botRate: number;
  };
  recentAnalyses: {
    conversationHash: string;
    messageCount: number;
    participantCount: number;
    platform: string;
    score: number;
    verdict: string;
    createdAt: Date;
    country: string | null;
    isBot: boolean;
  }[];
  topUsers: {
    ipAddress: string;
    country: string | null;
    analysisCount: number;
    avgScore: number;
  }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!sql) throw new Error("Database not available");

  // Total counts
  const [totalResult] = await sql`SELECT COUNT(*) as count FROM trollornot_analyses`;
  const [todayResult] = await sql`SELECT COUNT(*) as count FROM trollornot_analyses WHERE created_at > NOW() - INTERVAL '1 day'`;
  const [weekResult] = await sql`SELECT COUNT(*) as count FROM trollornot_analyses WHERE created_at > NOW() - INTERVAL '7 days'`;

  // Average score
  const [avgResult] = await sql`SELECT AVG(overall_score) as avg FROM trollornot_analyses WHERE overall_score IS NOT NULL`;

  // Verdict distribution
  const [genuineCount] = await sql`SELECT COUNT(*) as count FROM trollornot_analyses WHERE verdict = 'genuine'`;
  const [suspiciousCount] = await sql`SELECT COUNT(*) as count FROM trollornot_analyses WHERE verdict = 'suspicious'`;
  const [trollingCount] = await sql`SELECT COUNT(*) as count FROM trollornot_analyses WHERE verdict = 'trolling'`;

  // Platform breakdown
  const platformRows = await sql`SELECT platform, COUNT(*) as count FROM trollornot_analyses GROUP BY platform`;
  const platformBreakdown: Record<string, number> = {};
  for (const row of platformRows) {
    platformBreakdown[row.platform || "unknown"] = Number(row.count);
  }

  // Signal averages
  const [signalAvgs] = await sql`
    SELECT
      AVG(signal_bad_faith) as bad_faith,
      AVG(signal_provocation) as provocation,
      AVG(signal_engagement_bait) as engagement_bait,
      AVG(signal_strawmanning) as strawmanning,
      AVG(signal_derailing) as derailing
    FROM trollornot_analyses
    WHERE overall_score IS NOT NULL
  `;

  // Success rate (all are successful for now)
  const successRate = 100;

  // LLM enhanced rate
  const [llmResult] = await sql`SELECT COUNT(*) as count FROM trollornot_analyses WHERE llm_enhanced = true`;
  const llmEnhancedRate = Number(totalResult.count) > 0 ? (Number(llmResult.count) / Number(totalResult.count)) * 100 : 0;

  // Bot stats
  const [botCount] = await sql`SELECT COUNT(*) as count FROM trollornot_analyses WHERE is_bot = true`;
  const totalBots = Number(botCount?.count || 0);
  const totalHumans = Number(totalResult.count) - totalBots;
  const botRate = Number(totalResult.count) > 0 ? (totalBots / Number(totalResult.count)) * 100 : 0;

  // Recent analyses
  const recentRows = await sql`
    SELECT conversation_hash, message_count, participant_count, platform, overall_score, verdict, created_at, country, is_bot
    FROM trollornot_analyses
    ORDER BY created_at DESC
    LIMIT 100
  `;
  const recentAnalyses = recentRows.map((row) => ({
    conversationHash: row.conversation_hash,
    messageCount: Number(row.message_count),
    participantCount: Number(row.participant_count),
    platform: row.platform || "unknown",
    score: Number(row.overall_score),
    verdict: row.verdict || "unknown",
    createdAt: row.created_at,
    country: row.country || null,
    isBot: row.is_bot || false,
  }));

  // Top users by analysis count
  const topUserRows = await sql`
    SELECT ip_address, country, COUNT(*) as analysis_count, AVG(overall_score) as avg_score
    FROM trollornot_analyses
    WHERE ip_address IS NOT NULL
    GROUP BY ip_address, country
    ORDER BY analysis_count DESC
    LIMIT 15
  `;
  const topUsers = topUserRows.map((row) => ({
    ipAddress: row.ip_address,
    country: row.country || null,
    analysisCount: Number(row.analysis_count),
    avgScore: Math.round(Number(row.avg_score) || 0),
  }));

  return {
    totalAnalyses: Number(totalResult.count),
    todayAnalyses: Number(todayResult.count),
    weekAnalyses: Number(weekResult.count),
    avgScore: Math.round(Number(avgResult.avg) || 0),
    verdictDistribution: {
      genuine: Number(genuineCount.count),
      suspicious: Number(suspiciousCount.count),
      trolling: Number(trollingCount.count),
    },
    platformBreakdown,
    signalAverages: {
      badFaith: Math.round(Number(signalAvgs?.bad_faith) || 0),
      provocation: Math.round(Number(signalAvgs?.provocation) || 0),
      engagementBait: Math.round(Number(signalAvgs?.engagement_bait) || 0),
      strawmanning: Math.round(Number(signalAvgs?.strawmanning) || 0),
      derailing: Math.round(Number(signalAvgs?.derailing) || 0),
    },
    successRate: Math.round(successRate),
    llmEnhancedRate: Math.round(llmEnhancedRate),
    botStats: {
      totalBots,
      totalHumans,
      botRate: Math.round(botRate),
    },
    recentAnalyses,
    topUsers,
  };
}

export interface VisitorStats {
  totalVisitors: number;
  todayVisitors: number;
  weekVisitors: number;
  conversionRate: number;
  recentVisitors: {
    ipAddress: string | null;
    country: string | null;
    referrer: string | null;
    createdAt: Date;
    isBot: boolean;
  }[];
  timeSeries: {
    date: string;
    visitors: number;
    analyses: number;
  }[];
}

export async function getVisitorStats(): Promise<VisitorStats> {
  if (!sql) throw new Error("Database not available");

  try {
    const [totalResult] = await sql`SELECT COUNT(*) as count FROM trollornot_visitors`;
    const [todayResult] = await sql`SELECT COUNT(*) as count FROM trollornot_visitors WHERE created_at > NOW() - INTERVAL '1 day'`;
    const [weekResult] = await sql`SELECT COUNT(*) as count FROM trollornot_visitors WHERE created_at > NOW() - INTERVAL '7 days'`;

    const [analysesToday] = await sql`SELECT COUNT(*) as count FROM trollornot_analyses WHERE created_at > NOW() - INTERVAL '1 day'`;

    const conversionRate = Number(todayResult.count) > 0
      ? (Number(analysesToday.count) / Number(todayResult.count)) * 100
      : 0;

    const recentRows = await sql`
      SELECT ip_address, country, referrer, created_at, is_bot
      FROM trollornot_visitors
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const recentVisitors = recentRows.map((row) => ({
      ipAddress: row.ip_address || null,
      country: row.country || null,
      referrer: row.referrer || null,
      createdAt: row.created_at,
      isBot: row.is_bot || false,
    }));

    // Time series for last 14 days
    const timeSeriesRows = await sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM trollornot_visitors
      WHERE created_at > NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    const analysisTimeSeriesRows = await sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM trollornot_analyses
      WHERE created_at > NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    // Merge time series
    const visitorsByDate = new Map(timeSeriesRows.map(r => [r.date, Number(r.count)]));
    const analysesByDate = new Map(analysisTimeSeriesRows.map(r => [r.date, Number(r.count)]));

    const allDates = new Set([...visitorsByDate.keys(), ...analysesByDate.keys()]);
    const timeSeries = Array.from(allDates)
      .sort()
      .map(date => ({
        date: String(date).split('T')[0],
        visitors: visitorsByDate.get(date) || 0,
        analyses: analysesByDate.get(date) || 0,
      }));

    return {
      totalVisitors: Number(totalResult.count),
      todayVisitors: Number(todayResult.count),
      weekVisitors: Number(weekResult.count),
      conversionRate: Math.round(conversionRate),
      recentVisitors,
      timeSeries,
    };
  } catch (error) {
    console.error("Failed to get visitor stats:", error);
    return {
      totalVisitors: 0,
      todayVisitors: 0,
      weekVisitors: 0,
      conversionRate: 0,
      recentVisitors: [],
      timeSeries: [],
    };
  }
}
