"use client";

import { useState, useMemo, useCallback, useRef } from "react";

type Verdict = "genuine" | "suspicious" | "trolling";

interface SignalBreakdown {
  badFaith: number;
  provocation: number;
  engagementBait: number;
  strawmanning: number;
  derailing: number;
}

interface Highlight {
  start: number;
  end: number;
  category: string;
  text: string;
}

interface MessageAnalysis {
  id: string;
  author: string;
  content: string;
  timestamp?: string;
  score: number;
  verdict: Verdict;
  signals: SignalBreakdown;
  highlights: Highlight[];
}

interface AnalysisResult {
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

const SIGNAL_LABELS: Record<keyof SignalBreakdown, string> = {
  badFaith: "Bad Faith",
  provocation: "Provocation",
  engagementBait: "Engagement Bait",
  strawmanning: "Strawmanning",
  derailing: "Derailing",
};

const CATEGORY_COLORS: Record<string, string> = {
  badFaith: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200",
  provocation: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200",
  engagementBait: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  strawmanning: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
  derailing: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
};

const EXAMPLE_CONVERSATION = `Alice: Hey, did you see the new policy changes?
Bob: Yeah, it's pretty controversial
Alice: I think there are some valid concerns on both sides
Bob: lol cope. you're just mad because you're wrong
Alice: I'm not mad, I'm trying to have a discussion
Bob: sure buddy. let me guess, you probably think the sky is green too
Alice: That's not what I said at all
Bob: whatever. this is pointless. blocked`;

function BentoCard({ children, className = "", title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col ${className}`}>
      {title && (
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {title}
          </h3>
        </div>
      )}
      <div className="p-4 md:p-6 flex-1">{children}</div>
    </div>
  );
}

function VerdictBadge({ verdict, score }: { verdict: Verdict; score: number }) {
  const config = {
    genuine: {
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      border: "border-emerald-300 dark:border-emerald-700",
      text: "text-emerald-700 dark:text-emerald-300",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: "Genuine",
    },
    suspicious: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      border: "border-amber-300 dark:border-amber-700",
      text: "text-amber-700 dark:text-amber-300",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      label: "Suspicious",
    },
    trolling: {
      bg: "bg-rose-100 dark:bg-rose-900/30",
      border: "border-rose-300 dark:border-rose-700",
      text: "text-rose-700 dark:text-rose-300",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: "Trolling",
    },
  };

  const c = config[verdict];

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 ${c.bg} ${c.border}`}>
      <div className={c.text}>{c.icon}</div>
      <div className={`mt-3 text-2xl font-bold ${c.text}`}>{c.label}</div>
      <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Score: {score}/100
      </div>
    </div>
  );
}

function SignalBar({ label, value }: { label: string; value: number }) {
  const getBarColor = (val: number) => {
    if (val < 30) return "bg-emerald-500";
    if (val < 60) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="group">
      <div className="flex justify-between mb-2">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {label}
        </span>
        <span className="text-xs font-mono text-zinc-500">{Math.round(value)}%</span>
      </div>
      <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor(value)} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ChatMessage({ message, showHighlights }: { message: MessageAnalysis; showHighlights: boolean }) {
  const verdictBadge = {
    genuine: { color: "bg-emerald-500", icon: "✓" },
    suspicious: { color: "bg-amber-500", icon: "?" },
    trolling: { color: "bg-rose-500", icon: "!" },
  };

  const badge = verdictBadge[message.verdict];

  // Render content with highlights
  const renderContent = () => {
    if (!showHighlights || message.highlights.length === 0) {
      return <span>{message.content}</span>;
    }

    const sortedHighlights = [...message.highlights].sort((a, b) => a.start - b.start);
    const elements: React.ReactNode[] = [];
    let lastEnd = 0;

    sortedHighlights.forEach((h, i) => {
      if (h.start > lastEnd) {
        elements.push(<span key={`text-${i}`}>{message.content.substring(lastEnd, h.start)}</span>);
      }
      elements.push(
        <mark
          key={`highlight-${i}`}
          className={`${CATEGORY_COLORS[h.category] || "bg-yellow-100 text-yellow-800"} px-0.5 rounded cursor-help`}
          title={SIGNAL_LABELS[h.category as keyof SignalBreakdown] || h.category}
        >
          {message.content.substring(h.start, h.end)}
        </mark>
      );
      lastEnd = h.end;
    });

    if (lastEnd < message.content.length) {
      elements.push(<span key="text-end">{message.content.substring(lastEnd)}</span>);
    }

    return <>{elements}</>;
  };

  return (
    <div className="flex gap-3 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300">
          {message.author[0].toUpperCase()}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            {message.author}
          </span>
          {message.timestamp && (
            <span className="text-xs text-zinc-400">{message.timestamp}</span>
          )}
          <span
            className={`ml-auto flex-shrink-0 w-5 h-5 rounded-full ${badge.color} text-white text-xs flex items-center justify-center font-bold`}
            title={`${message.verdict} (${message.score}/100)`}
          >
            {badge.icon}
          </span>
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
          {renderContent()}
        </p>
      </div>
    </div>
  );
}

function ShareableImage({ result }: { result: AnalysisResult }) {
  const [status, setStatus] = useState<"idle" | "generating" | "copied" | "downloaded">("idle");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas || !result.success) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Canvas dimensions (Twitter-friendly 16:9)
    const width = 1200;
    const height = 675;
    canvas.width = width;
    canvas.height = height;

    // 1. Background
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, width, height);
    
    // 2. Header
    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, width, 80);
    ctx.strokeStyle = "#27272a";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, 80);

    // Header Content
    ctx.font = "bold 22px monospace";
    ctx.fillStyle = "#fafafa";
    ctx.fillText("TROLLORNOT // CLASSIFIED REPORT", 40, 48);

    const scanId = Math.random().toString(36).substring(2, 10).toUpperCase();
    ctx.font = "12px monospace";
    ctx.fillStyle = "#71717a";
    ctx.textAlign = "right";
    ctx.fillText(`SCAN_ID: ${scanId} | DEPTH: HIGH_RESOLUTION | ${new Date().toISOString()}`, width - 40, 48);
    ctx.textAlign = "left";

    // 3. Left Column (0-400)
    // Verdict
    const verdictConfig = {
      genuine: { color: "#10b981", label: "GENUINE_INTERACTION" },
      suspicious: { color: "#f59e0b", label: "SUSPICIOUS_ACTIVITY" },
      trolling: { color: "#f43f5e", label: "TROLL_CONFIRMED" },
    };
    const vc = verdictConfig[result.verdict!];

    ctx.strokeStyle = vc.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 110, 320, 80);
    
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = vc.color;
    ctx.fillText("STATUS_RESULT", 55, 130);
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.fillText(vc.label, 55, 170);

    // Score
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#71717a";
    ctx.fillText("AGGREGATE_RISK_SCORE", 40, 230);
    ctx.font = "bold 48px system-ui, sans-serif";
    ctx.fillStyle = "#f4f4f5";
    ctx.fillText(`${result.overallScore}`, 40, 280);
    ctx.font = "16px monospace";
    ctx.fillStyle = "#3f3f46";
    ctx.fillText("/ 100.00", 140, 275);

    // Signals
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#71717a";
    ctx.fillText("BEHAVIORAL_SIGNALS", 40, 330);

    let signalY = 360;
    const signals = Object.entries(result.aggregateSignals || {}).slice(0, 5);
    for (const [key, value] of signals) {
      ctx.font = "11px monospace";
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText(SIGNAL_LABELS[key as keyof SignalBreakdown].toUpperCase(), 40, signalY);
      
      // Bar
      ctx.fillStyle = "#18181b";
      ctx.fillRect(40, signalY + 8, 320, 4);
      ctx.fillStyle = value > 50 ? "#f43f5e" : value > 20 ? "#f59e0b" : "#10b981";
      ctx.fillRect(40, signalY + 8, 3.2 * value, 4);
      
      ctx.textAlign = "right";
      ctx.fillText(`${Math.round(value)}%`, 360, signalY);
      ctx.textAlign = "left";
      signalY += 35;
    }

    // Recommendation (Fills bottom left)
    if (result.recommendation) {
      ctx.fillStyle = "#18181b";
      ctx.fillRect(40, 540, 320, 95);
      ctx.strokeStyle = "#27272a";
      ctx.strokeRect(40, 540, 320, 95);

      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "#71717a";
      ctx.fillText("DIRECTIVE/RECOMMENDATION", 55, 560);
      
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillStyle = "#d4d4d8";
      const recWords = result.recommendation.split(" ");
      let recLine = "";
      let recY = 580;
      for (const word of recWords) {
        if (ctx.measureText(recLine + word).width > 290) {
          ctx.fillText(recLine.trim(), 55, recY);
          recLine = word + " ";
          recY += 18;
          if (recY > 625) break;
        } else recLine += word + " ";
      }
      if (recY <= 625) ctx.fillText(recLine.trim(), 55, recY);
    }

    // 4. Right Column (Evidence)
    ctx.strokeStyle = "#27272a";
    ctx.beginPath();
    ctx.moveTo(400, 80);
    ctx.lineTo(400, height);
    ctx.stroke();

    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#71717a";
    ctx.fillText("TRANSCRIPT_EVIDENCE", 430, 115);

    // Messages - more compact, show more
    let msgY = 140;
    const maxMsgY = 620;
    const messages = result.messages?.slice(0, 10) || [];

    for (const msg of messages) {
      if (msgY > maxMsgY) break;

      // Author with verdict indicator
      const isTroll = msg.verdict === "trolling";
      const isSus = msg.verdict === "suspicious";
      ctx.fillStyle = isTroll ? "#f43f5e" : isSus ? "#f59e0b" : "#71717a";
      ctx.font = "bold 12px system-ui, sans-serif";
      const authorText = `${isTroll ? "▸ " : ""}${msg.author}`;
      ctx.fillText(authorText, 430, msgY);

      // Message content - better word wrap
      ctx.fillStyle = isTroll ? "#fca5a5" : "#a1a1aa";
      ctx.font = "13px system-ui, sans-serif";

      const maxWidth = 720;
      const maxLines = 2;
      const words = msg.content.split(" ");
      let lines: string[] = [];
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine + (currentLine ? " " : "") + word;
        if (ctx.measureText(testLine).width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
          if (lines.length >= maxLines) break;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine && lines.length < maxLines) {
        lines.push(currentLine);
      }

      // Truncate last line if needed
      if (lines.length === maxLines && words.length > lines.join(" ").split(" ").length) {
        const lastLine = lines[maxLines - 1];
        if (ctx.measureText(lastLine + "...").width > maxWidth) {
          lines[maxLines - 1] = lastLine.substring(0, lastLine.length - 3) + "...";
        } else {
          lines[maxLines - 1] = lastLine + "...";
        }
      }

      let lineY = msgY + 18;
      for (const line of lines) {
        ctx.fillText(line, 430, lineY);
        lineY += 17;
      }

      msgY = lineY + 12;
    }

    // Show count of remaining messages
    if (result.messages && result.messages.length > messages.length) {
      ctx.font = "11px monospace";
      ctx.fillStyle = "#52525b";
      ctx.fillText(`+ ${result.messages.length - messages.length} more messages`, 430, Math.min(msgY, 650));
    }

    // Footer
    ctx.font = "11px monospace";
    ctx.fillStyle = "#3f3f46";
    ctx.fillText("trollornot.com", 40, 660);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
    });
  }, [result]);

  const handleCopyImage = async () => {
    setStatus("generating");
    try {
      const blob = await generateImage();
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]);
        setStatus("copied");
        setTimeout(() => setStatus("idle"), 2000);
      }
    } catch (err) {
      console.error("Failed to copy image:", err);
      // Fallback to download if clipboard fails
      handleDownload();
    }
  };

  const handleDownload = async () => {
    setStatus("generating");
    const blob = await generateImage();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trollornot-${result.verdict}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("downloaded");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <canvas ref={canvasRef} className="hidden" />
      <button
        onClick={handleCopyImage}
        disabled={status === "generating"}
        className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-rose-500 text-white rounded-lg font-medium text-sm hover:from-purple-500 hover:to-rose-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {status === "generating" ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating...
          </>
        ) : status === "copied" ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Image Copied!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Copy as Image
          </>
        )}
      </button>
      <button
        onClick={handleDownload}
        disabled={status === "generating"}
        className="w-full py-2 px-4 bg-zinc-800 text-zinc-300 rounded-lg font-medium text-sm hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {status === "downloaded" ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Downloaded!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Image
          </>
        )}
      </button>
    </div>
  );
}

export default function Home() {
  const [conversation, setConversation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showHighlights, setShowHighlights] = useState(true);
  const [image, setImage] = useState<{ data: string; type: string; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64 = dataUrl.split(",")[1];
      const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      setImage({ data: base64, type: mediaType, preview: dataUrl });
      setConversation(""); // Clear text when image is added
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageFile(file);
        return;
      }
    }
  }, [handleImageFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  }, [handleImageFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const clearImage = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const analyze = async () => {
    if (!conversation.trim() && !image) return;

    setLoading(true);
    setResult(null);

    try {
      const body: Record<string, string> = {};

      if (image) {
        body.image = image.data;
        body.imageType = image.type;
      } else {
        body.conversation = conversation.trim();
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      setResult(data);
    } catch {
      setResult({
        success: false,
        error: "Failed to connect to server",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyze();
  };

  const tryExample = () => {
    setConversation(EXAMPLE_CONVERSATION);
    clearImage();
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Navigation */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-zinc-900 dark:bg-zinc-100 rounded-sm" />
            <span className="font-bold text-lg tracking-tight">TrollOrNot</span>
          </div>
          <div className="flex gap-4 text-sm font-medium text-zinc-500">
            <a href="/about" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">About</a>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
        {/* Hero Section */}
        {!result && (
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-6">
              Is this person <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-600">trolling you?</span>
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
              Paste a conversation or screenshot to detect trolling, bad faith arguments, and engagement bait.
            </p>
          </div>
        )}

        {/* Input Form */}
        {!result && (
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div
              className="relative"
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {image ? (
                <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-2 right-2 p-1 bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-full z-10"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <img
                    src={image.preview}
                    alt="Screenshot to analyze"
                    className="max-h-80 mx-auto rounded-lg"
                  />
                  <p className="text-center text-xs text-zinc-500 mt-3">
                    Screenshot ready for analysis
                  </p>
                </div>
              ) : (
                <textarea
                  value={conversation}
                  onChange={(e) => setConversation(e.target.value)}
                  placeholder="Paste your conversation or screenshot here...

You can:
• Paste text (Cmd/Ctrl+V)
• Paste a screenshot (Cmd/Ctrl+V)
• Drag & drop an image
• Upload an image

Supported formats: Discord, Slack, Twitter, iMessage, etc."
                  className="w-full h-64 px-4 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm"
                />
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={tryExample}
                  className="text-sm font-medium text-zinc-500 hover:text-purple-600 transition-colors"
                >
                  Try an example
                </button>
                <label className="text-sm font-medium text-zinc-500 hover:text-purple-600 transition-colors cursor-pointer flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload image
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFile(file);
                    }}
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={loading || (!conversation.trim() && !image)}
                className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {image ? "Extracting & Analyzing..." : "Analyzing..."}
                  </>
                ) : (
                  "Analyze"
                )}
              </button>
            </div>
          </form>
        )}

        {/* Results */}
        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* Back Button */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setResult(null);
                  setConversation("");
                  clearImage();
                }}
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                New Analysis
              </button>
            </div>

            {!result.success ? (
              <div className="max-w-xl mx-auto p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-center text-sm text-rose-700 dark:text-rose-300">
                <p className="font-medium">{result.error}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Verdict & Signals */}
                <div className="md:col-span-4 space-y-6">
                  <BentoCard title="Verdict">
                    <VerdictBadge verdict={result.verdict!} score={result.overallScore!} />
                    <div className="mt-4 text-center">
                      <span className="text-xs text-zinc-500">
                        {result.participantCount} participants • {result.messages?.length} messages • {result.platform}
                      </span>
                      {result.llmEnhanced && (
                        <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded uppercase">
                          AI Enhanced
                        </span>
                      )}
                    </div>
                    <ShareableImage result={result} />
                  </BentoCard>

                  <BentoCard title="Signal Breakdown">
                    <div className="space-y-4">
                      {result.aggregateSignals && Object.entries(result.aggregateSignals).map(([key, value]) => (
                        <SignalBar key={key} label={SIGNAL_LABELS[key as keyof SignalBreakdown]} value={value} />
                      ))}
                    </div>
                  </BentoCard>

                  {result.flaggedUsers && result.flaggedUsers.length > 0 && (
                    <BentoCard title="Flagged Users">
                      <div className="space-y-3">
                        {result.flaggedUsers.map((user) => (
                          <div key={user.author} className="flex items-center justify-between p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                            <span className="font-medium text-sm text-rose-700 dark:text-rose-300">@{user.author}</span>
                            <span className="text-xs text-rose-600 dark:text-rose-400">
                              avg {user.avgScore} • {user.messageCount} msgs
                            </span>
                          </div>
                        ))}
                      </div>
                    </BentoCard>
                  )}
                </div>

                {/* Conversation & Analysis */}
                <div className="md:col-span-8 space-y-6">
                  {result.recommendation && (
                    <div className={`p-4 rounded-lg border-l-4 ${
                      result.verdict === "genuine" ? "bg-emerald-50 border-emerald-500 dark:bg-emerald-900/10" :
                      result.verdict === "suspicious" ? "bg-amber-50 border-amber-500 dark:bg-amber-900/10" :
                      "bg-rose-50 border-rose-500 dark:bg-rose-900/10"
                    }`}>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Recommendation</h3>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">{result.recommendation}</p>
                    </div>
                  )}

                  {result.reasoning && result.reasoning.length > 0 && (
                    <BentoCard title="Analysis">
                      <ul className="space-y-2">
                        {result.reasoning.map((reason, i) => (
                          <li key={i} className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                            <span className="text-purple-500">•</span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                      {result.contextNotes && (
                        <p className="mt-4 text-xs text-zinc-500 italic border-t border-zinc-100 dark:border-zinc-800 pt-4">
                          {result.contextNotes}
                        </p>
                      )}
                    </BentoCard>
                  )}

                  <BentoCard title="Conversation">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-xs text-zinc-500">
                        {result.messages?.filter(m => m.verdict !== "genuine").length} flagged messages
                      </span>
                      <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showHighlights}
                          onChange={(e) => setShowHighlights(e.target.checked)}
                          className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                        />
                        Show highlights
                      </label>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto pr-2">
                      {result.messages?.map((msg) => (
                        <ChatMessage key={msg.id} message={msg} showHighlights={showHighlights} />
                      ))}
                    </div>
                  </BentoCard>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
