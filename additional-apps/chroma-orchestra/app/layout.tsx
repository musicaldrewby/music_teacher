import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chroma Orchestra · Music in motion",
  description: "Turn your music into a cinematic marble machine orchestra.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
