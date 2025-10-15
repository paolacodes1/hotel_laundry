import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Controle de Lavanderia - Hotel Maerkli",
  description: "Sistema de controle de lavanderia para Hotel Maerkli",
  manifest: "/manifest.json",
  themeColor: "#3A5BA0",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lavanderia"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-gray-50`}>
        {children}
      </body>
    </html>
  );
}
