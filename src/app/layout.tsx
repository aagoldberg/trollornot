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
  title: "TrollOrNot - Detect Trolling in Conversations",
  description: "Paste a conversation to detect trolling, bad faith arguments, and engagement bait. Works with Discord, Slack, Twitter, and more.",
  openGraph: {
    title: "TrollOrNot - Detect Trolling in Conversations",
    description: "Paste a conversation to detect trolling, bad faith arguments, and engagement bait.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrollOrNot - Detect Trolling in Conversations",
    description: "Paste a conversation to detect trolling, bad faith arguments, and engagement bait.",
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
