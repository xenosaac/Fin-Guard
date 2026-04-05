import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fin-Guard — Read-Only AI Financial Guardian",
  description:
    "Zero-trust AI agent that monitors your finances but can NEVER modify your data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">{children}</body>
    </html>
  );
}
