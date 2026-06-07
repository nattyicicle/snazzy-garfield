import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Practice Player",
  description: "A private synchronized stem player for band practice."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
