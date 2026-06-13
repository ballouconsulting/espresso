import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Espresso Field Guide",
  description:
    "A practical, repeatable system for making better espresso at home.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
