import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { initializeErrorHandling } from "@/lib/error-handler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// metadataはServer Componentであるlayout.tsxに残す
export const metadata: Metadata = {
  title: "Crypto Article System",
  description: "AI-powered crypto article generation system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // エラーハンドリング初期化
  if (typeof window === 'undefined') {
    initializeErrorHandling()
  }

  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* AppProviderでchildrenをラップする */}
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}