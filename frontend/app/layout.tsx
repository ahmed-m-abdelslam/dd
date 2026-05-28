import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Universal Video Downloader",
  description:
    "Download videos from YouTube, Facebook, Instagram, TikTok, Threads, X, and LinkedIn.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⬇️</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
