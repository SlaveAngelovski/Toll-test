import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toll Passage Manager",
  description:
    "Review and manage congestion tax passages with hourly rules and fee caps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
