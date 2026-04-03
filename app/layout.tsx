import type { Metadata } from "next"
import { Lato } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { Providers } from "@/components/providers"

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Product School Campaign Manager",
  description: "LinkedIn outreach automation and campaign management for Product School",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={lato.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
