import type { Metadata } from "next";
import { Bebas_Neue, DM_Mono, Crimson_Pro } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const dmMono = DM_Mono({
  weight: ["300", "400"],
  subsets: ["latin"],
  variable: "--font-mono",
});

const crimsonPro = Crimson_Pro({
  weight: ["300"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "EARWORM — Music Trivia",
  description: "Three Spotify-powered music games. How well do you know your ears?",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${dmMono.variable} ${crimsonPro.variable}`}>
      <body className="bg-bg text-textmid antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
