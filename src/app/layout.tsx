import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/layout/cookie-banner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EnzymeForge — computational enzyme engineering",
  description:
    "Retrieve, design, and evaluate enzymes for sustainable chemistry. Calibrated against bench data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable} ${jetbrainsMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-full flex flex-col antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        <CookieBanner />
        <Toaster richColors closeButton position="bottom-right" />
      </body>
    </html>
  );
}
