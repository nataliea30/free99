import React from "react"
import type { Metadata, Viewport } from "next"
import { DM_Sans, Space_Mono } from "next/font/google"
import { Navbar } from "@/components/navbar"
import { MobileNav } from "@/components/mobile-nav"
import { PageTransition } from "@/components/page-transition"

import "./globals.css"

export const metadata: Metadata = {
  title: "neighbr2neighbr - Campus Marketplace",
  description:
    "The free marketplace for university students. List, browse, and claim items from your campus community.",
}

export const viewport: Viewport = {
  themeColor: "#19a96c",
  width: "device-width",
  initialScale: 1,
}

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
})

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${spaceMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Navbar />
        <main className="pb-20 md:pb-0">
          <PageTransition>{children}</PageTransition>
        </main>
        <MobileNav />
      </body>
    </html>
  )
}
