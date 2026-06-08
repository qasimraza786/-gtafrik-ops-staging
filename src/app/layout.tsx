import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

// Inter is the GT Afrik brand title typeface (SemiBold/Bold/ExtraBold).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GT Afrik OPS",
  description: "GPS Fleet Operations Management — Central Africa",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable}`}
      style={{ fontFamily: "var(--font-inter), 'Helvetica Neue', Arial, system-ui, sans-serif" }}
    >
      <body>{children}</body>
    </html>
  );
}
