import Link from "next/link";

export default function About() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Navigation */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-5 h-5 bg-zinc-900 dark:bg-zinc-100 rounded-sm" />
            <span className="font-bold text-lg tracking-tight">TrollOrNot</span>
          </Link>
          <div className="flex gap-4 text-sm font-medium text-zinc-500">
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Home</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <h1 className="text-3xl font-bold tracking-tight mb-8">About TrollOrNot</h1>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">What is this?</h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              TrollOrNot is a tool that analyzes online conversations to detect patterns commonly associated with trolling behavior. It uses a combination of rule-based pattern matching and AI analysis to identify bad faith arguments, provocation, engagement bait, and other manipulation tactics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">How does it work?</h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
              The analysis happens in two stages:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-zinc-600 dark:text-zinc-400">
              <li><strong>Rule-based scoring:</strong> The conversation is scanned for known trolling patterns across 5 categories: Bad Faith, Provocation, Engagement Bait, Strawmanning, and Derailing.</li>
              <li><strong>AI enhancement:</strong> When available, Claude AI reviews the conversation to understand context, identify false positives, and provide nuanced analysis.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">What it detects</h2>
            <div className="grid gap-4">
              <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <h3 className="font-semibold text-purple-600 dark:text-purple-400">Bad Faith</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Sealioning, moving goalposts, feigning ignorance, never actually engaging with responses.</p>
              </div>
              <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <h3 className="font-semibold text-rose-600 dark:text-rose-400">Provocation</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Intentionally inflammatory language, seeking emotional reactions over discussion.</p>
              </div>
              <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <h3 className="font-semibold text-orange-600 dark:text-orange-400">Engagement Bait</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Performative responses designed to provoke reactions rather than discuss.</p>
              </div>
              <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <h3 className="font-semibold text-blue-600 dark:text-blue-400">Strawmanning</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Deliberately misrepresenting others positions to attack a weaker argument.</p>
              </div>
              <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <h3 className="font-semibold text-amber-600 dark:text-amber-400">Derailing</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Topic hijacking, whataboutism, deflection from the actual discussion.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">What it does NOT do</h2>
            <ul className="list-disc list-inside space-y-2 text-zinc-600 dark:text-zinc-400">
              <li>Judge opinions or political views</li>
              <li>Determine who is right or wrong</li>
              <li>Identify genuine disagreement as trolling</li>
              <li>Flag sarcasm between friends as trolling</li>
              <li>Make judgments based on single messages</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Privacy</h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Conversations you analyze are processed on our servers and may be logged for analytics (without identifying information). We do not store the full conversation text - only aggregate statistics. No personal information is collected or shared.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Disclaimer</h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              This tool provides analysis based on linguistic patterns and is not definitive. Context matters, and the tool may produce false positives or negatives. Use your own judgment when interpreting results. This tool is for informational purposes only.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to analyzer
          </Link>
        </div>
      </div>
    </div>
  );
}
