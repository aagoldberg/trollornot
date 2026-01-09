export interface ParsedMessage {
  id: string;
  author: string;
  content: string;
  timestamp?: string;
  platform?: "discord" | "slack" | "twitter" | "generic";
}

export interface ParsedConversation {
  messages: ParsedMessage[];
  platform: "discord" | "slack" | "twitter" | "generic";
  participantCount: number;
}

// Discord format: "Username#1234 — Today at 12:34 PM" or "[12:34 PM] Username:"
const DISCORD_PATTERN_1 = /^(.+?)(?:#\d{4})?\s*[—–-]\s*(.+)$/;
const DISCORD_PATTERN_2 = /^\[([^\]]+)\]\s*([^:]+):\s*(.*)$/;

// Slack format: "Username  12:34 PM" (double space before time)
const SLACK_PATTERN = /^([^\s]+)\s{2,}(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*$/i;

// Twitter/X format: "@username · 2h" or "username @handle · 2h"
const TWITTER_PATTERN = /^@?(\w+)\s*·\s*(\d+[hmdw]|[\d/]+)$/;

// Generic format: "Username: message"
const GENERIC_PATTERN = /^([^:]+):\s*(.*)$/;

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function detectPlatform(text: string): "discord" | "slack" | "twitter" | "generic" {
  const lines = text.split("\n").filter((l) => l.trim());

  let discordScore = 0;
  let slackScore = 0;
  let twitterScore = 0;

  for (const line of lines.slice(0, 10)) {
    if (DISCORD_PATTERN_1.test(line) || DISCORD_PATTERN_2.test(line)) {
      discordScore++;
    }
    if (SLACK_PATTERN.test(line)) {
      slackScore++;
    }
    if (TWITTER_PATTERN.test(line) || line.startsWith("@")) {
      twitterScore++;
    }
    // Discord-specific indicators
    if (line.includes("Today at") || line.includes("Yesterday at") || /#\d{4}/.test(line)) {
      discordScore += 2;
    }
    // Slack-specific indicators
    if (/\s{2,}\d{1,2}:\d{2}/.test(line)) {
      slackScore += 2;
    }
    // Twitter-specific indicators
    if (/·\s*\d+[hmdw]/.test(line) || /Replying to @/.test(line)) {
      twitterScore += 2;
    }
  }

  if (discordScore >= slackScore && discordScore >= twitterScore && discordScore > 0) {
    return "discord";
  }
  if (slackScore >= discordScore && slackScore >= twitterScore && slackScore > 0) {
    return "slack";
  }
  if (twitterScore >= discordScore && twitterScore >= slackScore && twitterScore > 0) {
    return "twitter";
  }

  return "generic";
}

function parseDiscord(text: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const lines = text.split("\n");

  let currentMessage: Partial<ParsedMessage> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try pattern 1: "Username#1234 — Today at 12:34 PM"
    const match1 = trimmed.match(DISCORD_PATTERN_1);
    if (match1) {
      if (currentMessage && currentMessage.author && currentMessage.content) {
        messages.push({
          id: generateId(),
          author: currentMessage.author,
          content: currentMessage.content.trim(),
          timestamp: currentMessage.timestamp,
          platform: "discord",
        });
      }
      currentMessage = {
        author: match1[1].trim(),
        timestamp: match1[2].trim(),
        content: "",
      };
      continue;
    }

    // Try pattern 2: "[12:34 PM] Username: message"
    const match2 = trimmed.match(DISCORD_PATTERN_2);
    if (match2) {
      if (currentMessage && currentMessage.author && currentMessage.content) {
        messages.push({
          id: generateId(),
          author: currentMessage.author,
          content: currentMessage.content.trim(),
          timestamp: currentMessage.timestamp,
          platform: "discord",
        });
      }
      messages.push({
        id: generateId(),
        author: match2[2].trim(),
        content: match2[3].trim(),
        timestamp: match2[1].trim(),
        platform: "discord",
      });
      currentMessage = null;
      continue;
    }

    // Continuation of previous message
    if (currentMessage) {
      currentMessage.content = (currentMessage.content || "") + "\n" + trimmed;
    }
  }

  // Don't forget the last message
  if (currentMessage && currentMessage.author && currentMessage.content) {
    messages.push({
      id: generateId(),
      author: currentMessage.author,
      content: currentMessage.content.trim(),
      timestamp: currentMessage.timestamp,
      platform: "discord",
    });
  }

  return messages;
}

function parseSlack(text: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const lines = text.split("\n");

  let currentMessage: Partial<ParsedMessage> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Slack header: "Username  12:34 PM"
    const match = trimmed.match(SLACK_PATTERN);
    if (match) {
      if (currentMessage && currentMessage.author && currentMessage.content) {
        messages.push({
          id: generateId(),
          author: currentMessage.author,
          content: currentMessage.content.trim(),
          timestamp: currentMessage.timestamp,
          platform: "slack",
        });
      }
      currentMessage = {
        author: match[1].trim(),
        timestamp: match[2].trim(),
        content: "",
      };
      continue;
    }

    // Continuation
    if (currentMessage) {
      currentMessage.content = (currentMessage.content || "") + "\n" + trimmed;
    } else {
      // Start new message without header
      const genericMatch = trimmed.match(GENERIC_PATTERN);
      if (genericMatch) {
        messages.push({
          id: generateId(),
          author: genericMatch[1].trim(),
          content: genericMatch[2].trim(),
          platform: "slack",
        });
      }
    }
  }

  if (currentMessage && currentMessage.author && currentMessage.content) {
    messages.push({
      id: generateId(),
      author: currentMessage.author,
      content: currentMessage.content.trim(),
      timestamp: currentMessage.timestamp,
      platform: "slack",
    });
  }

  return messages;
}

function parseTwitter(text: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const lines = text.split("\n");

  let currentMessage: Partial<ParsedMessage> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip "Replying to @..." lines
    if (trimmed.startsWith("Replying to")) continue;

    // Twitter header: "@username · 2h"
    const match = trimmed.match(TWITTER_PATTERN);
    if (match) {
      if (currentMessage && currentMessage.author && currentMessage.content) {
        messages.push({
          id: generateId(),
          author: currentMessage.author,
          content: currentMessage.content.trim(),
          timestamp: currentMessage.timestamp,
          platform: "twitter",
        });
      }
      currentMessage = {
        author: "@" + match[1],
        timestamp: match[2],
        content: "",
      };
      continue;
    }

    // Handle @username at start of line
    if (trimmed.startsWith("@") && !trimmed.includes(" ")) {
      if (currentMessage && currentMessage.author && currentMessage.content) {
        messages.push({
          id: generateId(),
          author: currentMessage.author,
          content: currentMessage.content.trim(),
          timestamp: currentMessage.timestamp,
          platform: "twitter",
        });
      }
      currentMessage = {
        author: trimmed,
        content: "",
      };
      continue;
    }

    // Continuation
    if (currentMessage) {
      currentMessage.content = (currentMessage.content || "") + "\n" + trimmed;
    }
  }

  if (currentMessage && currentMessage.author && currentMessage.content) {
    messages.push({
      id: generateId(),
      author: currentMessage.author,
      content: currentMessage.content.trim(),
      timestamp: currentMessage.timestamp,
      platform: "twitter",
    });
  }

  return messages;
}

function parseGeneric(text: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const lines = text.split("\n");

  let currentMessage: Partial<ParsedMessage> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try to match "Username: message"
    const match = trimmed.match(GENERIC_PATTERN);
    if (match) {
      if (currentMessage && currentMessage.author && currentMessage.content) {
        messages.push({
          id: generateId(),
          author: currentMessage.author,
          content: currentMessage.content.trim(),
          platform: "generic",
        });
      }
      currentMessage = {
        author: match[1].trim(),
        content: match[2].trim(),
      };
      continue;
    }

    // Continuation of previous message
    if (currentMessage) {
      currentMessage.content = (currentMessage.content || "") + "\n" + trimmed;
    } else {
      // Standalone line - treat as anonymous message
      messages.push({
        id: generateId(),
        author: "Unknown",
        content: trimmed,
        platform: "generic",
      });
    }
  }

  if (currentMessage && currentMessage.author && currentMessage.content) {
    messages.push({
      id: generateId(),
      author: currentMessage.author,
      content: currentMessage.content.trim(),
      platform: "generic",
    });
  }

  return messages;
}

export function parseConversation(text: string): ParsedConversation {
  const platform = detectPlatform(text);

  let messages: ParsedMessage[];

  switch (platform) {
    case "discord":
      messages = parseDiscord(text);
      break;
    case "slack":
      messages = parseSlack(text);
      break;
    case "twitter":
      messages = parseTwitter(text);
      break;
    default:
      messages = parseGeneric(text);
  }

  // If no messages were parsed, try generic as fallback
  if (messages.length === 0) {
    messages = parseGeneric(text);
  }

  // Count unique participants
  const participants = new Set(messages.map((m) => m.author.toLowerCase()));

  return {
    messages,
    platform: messages.length > 0 ? (messages[0].platform || "generic") : "generic",
    participantCount: participants.size,
  };
}
