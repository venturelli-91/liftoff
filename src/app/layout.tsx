import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "./nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Liftoff",
  description: "Cohort launch automation",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col md:flex-row">
        <aside className="flex shrink-0 items-center gap-6 border-b border-line bg-sidebar px-4 py-3 md:sticky md:top-0 md:h-screen md:w-60 md:flex-col md:items-stretch md:gap-8 md:border-r md:border-b-0 md:p-4">
          <span className="px-3 text-lg font-medium">Liftoff</span>
          <Nav />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </body>
    </html>
  );
}
