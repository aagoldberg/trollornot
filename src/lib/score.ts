export type SignalCategory =
  | "badFaith"
  | "provocation"
  | "engagementBait"
  | "strawmanning"
  | "derailing";

export interface Highlight {
  start: number;
  end: number;
  category: SignalCategory;
  text: string;
}

export interface SignalBreakdown {
  badFaith: number;
  provocation: number;
  engagementBait: number;
  strawmanning: number;
  derailing: number;
}

export type Verdict = "genuine" | "suspicious" | "trolling";

export interface MessageScoreResult {
  score: number;
  verdict: Verdict;
  signals: SignalBreakdown;
  highlights: Highlight[];
}

export interface ConversationScoreResult {
  overallScore: number;
  verdict: Verdict;
  messageResults: Map<string, MessageScoreResult>;
  aggregateSignals: SignalBreakdown;
  flaggedUsers: { author: string; avgScore: number; messageCount: number }[];
  patterns: string[];
}

// Troll signal dictionaries
const TROLL_DICTIONARIES: Record<SignalCategory, string[]> = {
  badFaith: [
    // Sealioning / JAQing
    "just asking",
    "just a question",
    "genuine question",
    "honest question",
    "serious question",
    "define",
    "prove it",
    "source?",
    "source please",
    "citation needed",
    "where's your proof",
    "show me evidence",
    // Moving goalposts
    "that's not what i meant",
    "i never said",
    "that's not the point",
    "you're missing the point",
    "not what we're talking about",
    // Feigned ignorance
    "what do you mean",
    "i don't understand",
    "explain",
    "what are you saying",
    "huh?",
    // Debate-bro tactics
    "well technically",
    "actually",
    "to be fair",
    "but actually",
    "um actually",
    "logically",
    "objectively",
    "by definition",
  ],

  provocation: [
    // Direct dismissals
    "cope",
    "copium",
    "seethe",
    "mald",
    "malding",
    "cry more",
    "cry about it",
    "stay mad",
    "die mad",
    "keep crying",
    "tears",
    // Mockery
    "lol",
    "lmao",
    "lmfao",
    "rofl",
    "kek",
    "haha",
    "😂",
    "🤣",
    "💀",
    "skull",
    "dead",
    "im dead",
    // Dismissive phrases
    "touch grass",
    "go outside",
    "get a life",
    "rent free",
    "living rent free",
    "imagine",
    "couldn't be me",
    "skill issue",
    "sounds like a you problem",
    "not my problem",
    "don't care",
    "nobody cares",
    "who cares",
    // Insults
    "clown",
    "🤡",
    "joke",
    "loser",
    "pathetic",
    "cringe",
    "yikes",
    "oof",
    "L take",
    "bad take",
    "trash take",
    "garbage",
    "braindead",
    "smooth brain",
    "npc",
    "bot",
    "shill",
  ],

  engagementBait: [
    // Ratio attempts
    "ratio",
    "ratiod",
    "counter ratio",
    "self ratio",
    // Dismissals seeking reaction
    "nobody asked",
    "who asked",
    "did i ask",
    "didn't ask",
    "don't remember asking",
    "when did i ask",
    // Competitive framing
    "L",
    "W",
    "common L",
    "common W",
    "rare L",
    "rare W",
    "massive L",
    "huge L",
    "big L",
    "fat L",
    // Dismissive trends
    "mid",
    "fell off",
    "washed",
    "finished",
    "cooked",
    "done",
    "over",
    "no one cares",
    "literally no one",
    "not a single person",
    // Explicit bait
    "explain yourself",
    "i'll wait",
    "go on",
    "prove me wrong",
    "change my mind",
    "debate me",
  ],

  strawmanning: [
    // Putting words in mouth
    "so you're saying",
    "so you think",
    "so you believe",
    "so you want",
    "so basically",
    "what you're saying is",
    "you're telling me",
    "you mean to tell me",
    // Generalization attacks
    "people like you",
    "your type",
    "you're the type",
    "you people",
    "all you guys",
    "you lot",
    // Presumption
    "let me guess",
    "i bet you",
    "you probably",
    "i'm sure you",
    "of course you",
    "typical",
    "classic",
    "predictable",
    // Sarcastic agreement
    "sure buddy",
    "sure thing",
    "right right",
    "okay sure",
    "yeah okay",
    "oh really",
    "is that so",
  ],

  derailing: [
    // Topic change
    "anyway",
    "moving on",
    "regardless",
    "whatever",
    "doesn't matter",
    "beside the point",
    "off topic",
    "irrelevant",
    // Whataboutism
    "but what about",
    "what about",
    "whatabout",
    "yeah but",
    "ok but",
    "sure but",
    "and yet",
    // Deflection
    "that's different",
    "not the same",
    "false equivalence",
    "nice try",
    "good one",
    "not even close",
    // Dismissive exit
    "this is pointless",
    "waste of time",
    "not worth it",
    "done here",
    "i'm out",
    "bye",
    "blocked",
    "muted",
    "not reading all that",
    "tldr",
    "didn't read",
    "too long",
  ],
};

// Weights for each category
const CATEGORY_WEIGHTS: Record<SignalCategory, number> = {
  badFaith: 25,
  provocation: 25,
  engagementBait: 20,
  strawmanning: 15,
  derailing: 15,
};

// Descriptions for pattern detection
const CATEGORY_DESCRIPTIONS: Record<SignalCategory, string> = {
  badFaith: "Bad faith argumentation (sealioning, moving goalposts)",
  provocation: "Provocative/dismissive language",
  engagementBait: "Engagement bait (ratio, reactions)",
  strawmanning: "Strawmanning (misrepresenting positions)",
  derailing: "Derailing (topic hijacking, whataboutism)",
};

export const SIGNAL_LABELS: Record<SignalCategory, string> = {
  badFaith: "Bad Faith",
  provocation: "Provocation",
  engagementBait: "Engagement Bait",
  strawmanning: "Strawmanning",
  derailing: "Derailing",
};

// Find matches in text
function findMatches(
  text: string,
  patterns: string[],
  category: SignalCategory
): { count: number; highlights: Highlight[] } {
  const lowerText = text.toLowerCase();
  const highlights: Highlight[] = [];
  let count = 0;

  for (const pattern of patterns) {
    const lowerPattern = pattern.toLowerCase();
    let searchStart = 0;

    while (true) {
      const index = lowerText.indexOf(lowerPattern, searchStart);
      if (index === -1) break;

      // Check word boundaries
      const before = index === 0 ? " " : lowerText[index - 1];
      const after =
        index + lowerPattern.length >= lowerText.length
          ? " "
          : lowerText[index + lowerPattern.length];

      const isWordBoundaryBefore = /[\s\.,;:!?"'()\[\]{}<>\/\-]/.test(before);
      const isWordBoundaryAfter = /[\s\.,;:!?"'()\[\]{}<>\/\-]/.test(after);

      if (isWordBoundaryBefore && isWordBoundaryAfter) {
        count++;
        highlights.push({
          start: index,
          end: index + lowerPattern.length,
          category,
          text: text.substring(index, index + lowerPattern.length),
        });
      }

      searchStart = index + 1;
    }
  }

  return { count, highlights };
}

// Score a single message
export function scoreMessage(text: string): MessageScoreResult {
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

  const allHighlights: Highlight[] = [];
  const rawCounts: Record<SignalCategory, number> = {
    badFaith: 0,
    provocation: 0,
    engagementBait: 0,
    strawmanning: 0,
    derailing: 0,
  };

  // Find matches for each category
  for (const category of Object.keys(TROLL_DICTIONARIES) as SignalCategory[]) {
    const { count, highlights } = findMatches(
      text,
      TROLL_DICTIONARIES[category],
      category
    );
    rawCounts[category] = count;
    allHighlights.push(...highlights);
  }

  // Deduplicate overlapping highlights
  const sortedHighlights = allHighlights.sort((a, b) => a.start - b.start);
  const dedupedHighlights: Highlight[] = [];
  let lastEnd = -1;

  for (const h of sortedHighlights) {
    if (h.start >= lastEnd) {
      dedupedHighlights.push(h);
      lastEnd = h.end;
    }
  }

  // Calculate signal breakdown (0-100 scale)
  // For short messages, we don't normalize as heavily
  const normalizer = wordCount > 10 ? wordCount / 10 : 1;

  const signals: SignalBreakdown = {
    badFaith: Math.min(100, (rawCounts.badFaith / normalizer) * 30),
    provocation: Math.min(100, (rawCounts.provocation / normalizer) * 25),
    engagementBait: Math.min(100, (rawCounts.engagementBait / normalizer) * 35),
    strawmanning: Math.min(100, (rawCounts.strawmanning / normalizer) * 40),
    derailing: Math.min(100, (rawCounts.derailing / normalizer) * 35),
  };

  // Calculate weighted score
  let score = 0;
  for (const category of Object.keys(CATEGORY_WEIGHTS) as SignalCategory[]) {
    score += (signals[category] / 100) * CATEGORY_WEIGHTS[category];
  }

  // Co-occurrence bonus
  const highCategories = Object.values(signals).filter((v) => v >= 30).length;
  if (highCategories >= 3) {
    score += 15;
  } else if (highCategories >= 2) {
    score += 8;
  }

  score = Math.min(100, Math.max(0, Math.round(score)));

  // Determine verdict
  let verdict: Verdict;
  if (score <= 25) {
    verdict = "genuine";
  } else if (score <= 55) {
    verdict = "suspicious";
  } else {
    verdict = "trolling";
  }

  return {
    score,
    verdict,
    signals,
    highlights: dedupedHighlights.slice(0, 20),
  };
}

// Score entire conversation
export function scoreConversation(
  messages: { id: string; author: string; content: string }[]
): ConversationScoreResult {
  const messageResults = new Map<string, MessageScoreResult>();
  const userScores: Record<string, { total: number; count: number }> = {};

  // Score each message
  for (const msg of messages) {
    const result = scoreMessage(msg.content);
    messageResults.set(msg.id, result);

    // Aggregate by user
    if (!userScores[msg.author]) {
      userScores[msg.author] = { total: 0, count: 0 };
    }
    userScores[msg.author].total += result.score;
    userScores[msg.author].count++;
  }

  // Calculate aggregate signals
  const aggregateSignals: SignalBreakdown = {
    badFaith: 0,
    provocation: 0,
    engagementBait: 0,
    strawmanning: 0,
    derailing: 0,
  };

  let totalWeight = 0;
  for (const result of messageResults.values()) {
    for (const category of Object.keys(aggregateSignals) as SignalCategory[]) {
      aggregateSignals[category] += result.signals[category];
    }
    totalWeight++;
  }

  if (totalWeight > 0) {
    for (const category of Object.keys(aggregateSignals) as SignalCategory[]) {
      aggregateSignals[category] = Math.round(
        aggregateSignals[category] / totalWeight
      );
    }
  }

  // Calculate overall score
  let overallScore = 0;
  for (const result of messageResults.values()) {
    overallScore += result.score;
  }
  overallScore = totalWeight > 0 ? Math.round(overallScore / totalWeight) : 0;

  // Identify flagged users (avg score > 40)
  const flaggedUsers = Object.entries(userScores)
    .map(([author, data]) => ({
      author,
      avgScore: Math.round(data.total / data.count),
      messageCount: data.count,
    }))
    .filter((u) => u.avgScore > 40)
    .sort((a, b) => b.avgScore - a.avgScore);

  // Detect patterns
  const patterns: string[] = [];

  // Check for escalation
  const scores = Array.from(messageResults.values()).map((r) => r.score);
  if (scores.length >= 3) {
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    if (secondAvg > firstAvg + 15) {
      patterns.push("Escalating hostility detected");
    }
  }

  // Check for dominant signal
  const maxSignal = Object.entries(aggregateSignals).reduce((a, b) =>
    a[1] > b[1] ? a : b
  );
  if (maxSignal[1] > 40) {
    patterns.push(`High ${CATEGORY_DESCRIPTIONS[maxSignal[0] as SignalCategory]}`);
  }

  // Check for repeat offender
  if (flaggedUsers.length === 1 && flaggedUsers[0].messageCount >= 3) {
    patterns.push(`Single user (@${flaggedUsers[0].author}) driving conflict`);
  }

  // Determine overall verdict
  let verdict: Verdict;
  if (overallScore <= 25) {
    verdict = "genuine";
  } else if (overallScore <= 55) {
    verdict = "suspicious";
  } else {
    verdict = "trolling";
  }

  return {
    overallScore,
    verdict,
    messageResults,
    aggregateSignals,
    flaggedUsers,
    patterns,
  };
}

export { TROLL_DICTIONARIES, CATEGORY_WEIGHTS, CATEGORY_DESCRIPTIONS };
