import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { initializeErrorHandling } from "@/lib/error-handler";
import { initializeApplication } from "@/lib/app-initializer";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { headers } from 'next/headers';
import Script from 'next/script';

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
  // middlewareからnonce値を取得
  const nonce = headers().get('x-nonce') || ''
  
  // サーバーサイドでの初期化処理
  if (typeof window === 'undefined') {
    initializeErrorHandling()
    // アプリケーション初期化（スケジューラー開始など）
    initializeApplication().catch(error => {
      console.error('Application initialization failed:', error)
    })
  }

  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* AuthProviderとAppProviderでchildrenをラップする */}
        <AuthProvider>
          <AppProvider>{children}</AppProvider>
        </AuthProvider>
        
        {/* nonceを必要とするスクリプトにnonceを渡す */}
        {nonce && (
          <Script
            id="nonce-support"
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                // CSP nonce support for dynamic scripts
                window.__CSP_NONCE__ = '${nonce}';
              `
            }}
          />
        )}
      </body>
    </html>
  );
}