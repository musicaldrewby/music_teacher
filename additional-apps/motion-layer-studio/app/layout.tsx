import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Motion Layer Studio",
  description: "Animate images with atmosphere, save your scenes, and create with your assistant.",
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
