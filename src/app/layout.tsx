import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || "https://trollornot.com"),
  title: "TrollOrNot - Detect Trolling in Conversations",
  description: "Paste a conversation or screenshot to detect trolling, bad faith arguments, and engagement bait. Works with Discord, Slack, Twitter, and more.",
  keywords: [
    "troll detector",
    "trolling detection",
    "bad faith argument",
    "engagement bait",
    "online harassment",
    "conversation analyzer",
    "Discord troll",
    "Twitter troll",
    "social media analysis",
    "AI troll detection",
  ],
  authors: [{ name: "TrollOrNot" }],
  creator: "TrollOrNot",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "TrollOrNot - Is this person trolling you?",
    description: "Paste a conversation or screenshot to detect trolling, bad faith arguments, and engagement bait.",
    type: "website",
    locale: "en_US",
    siteName: "TrollOrNot",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "TrollOrNot - Detect Trolling in Conversations",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrollOrNot - Is this person trolling you?",
    description: "Paste a conversation or screenshot to detect trolling, bad faith arguments, and engagement bait.",
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
