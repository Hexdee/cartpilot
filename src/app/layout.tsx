import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { ReactNode } from "react";
import { AppStoreProvider } from "@/providers/app-store";
import "./design-system.css";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "CartPilot AI",
  description: "AI shopping assistant for comparing offers, checking out, and tracking orders across supported ecommerce stores.",
  icons: {
    icon: "/cartpilot-logo.svg",
    shortcut: "/cartpilot-logo.svg",
    apple: "/cartpilot-logo.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
        <AppStoreProvider>{children}</AppStoreProvider>
      </body>
    </html>
  );
}
