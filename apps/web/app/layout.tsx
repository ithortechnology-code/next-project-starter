import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Project Starter · Account access",
  description: "A complete email and password account lifecycle example.",
  referrer: "no-referrer",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
