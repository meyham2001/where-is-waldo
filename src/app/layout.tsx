import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Where's Waldo? - Multiplayer Colleague Challenge",
  description: "Real-time multiplayer Where's Waldo hidden object game for up to 10 colleagues.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-rose-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
