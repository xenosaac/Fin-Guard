import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FIN—GUARD // Read-Only AI Financial Guardian",
  description:
    "Zero-trust AI agent that monitors your finances but can NEVER modify your data. Powered by Auth0 Token Vault.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="bg-[#050505] text-white antialiased"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
