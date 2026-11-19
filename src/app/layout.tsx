import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NUVORA AI",
  description: "Arabic-first interactive learning platform (development scaffold).",
};

// Temporary root layout for step 1.1. Step 1.3 moves the pages under a
// language folder (/ar, /fr, /en) and sets lang and dir per language.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
