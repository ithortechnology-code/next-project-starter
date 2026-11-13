import type { ReactNode } from "react";

export const metadata = { title: "Project Starter", description: "Your next project starts here." };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f7fb" }}>
        {children}
      </body>
    </html>
  );
}
