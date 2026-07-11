import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Macro Surveillance System",
  description: "GDP forecasting and early warning system"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="background-lights" />
        <nav className="navbar">
          <div className="brand">MacroVision AI</div>
          <div className="nav-links">
  <Link href="/">Forecast Interface</Link>
  <Link href="/scenario">2024-26 Scenario Dashboard</Link>
  <Link href="/about">About Us</Link>
</div>
        </nav>
        {children}
      </body>
    </html>
  );
}
