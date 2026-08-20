import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liara Docs Copilot",
  description:
    "An agentic AI assistant for exploring and interacting with Liara documentation.",
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
