import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { MotionConfig } from "framer-motion";

import { AppShell } from "@/components/app-shell";
import { AppToaster } from "@/components/app-toaster";
import { ProfileProvider } from "@/components/profile-provider";
import { AuthSessionProvider } from "@/components/session-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXTAUTH_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  ),
  title: {
    default: "Skillin",
    template: "%s · Skillin",
  },
  description:
    "Peer-to-peer skill exchange. Match with a partner and ship a 3-day collaborative quest.",
  applicationName: "Skillin",
  openGraph: {
    title: "Skillin — Build better, together",
    description:
      "Find a complementary collaborator, take on a focused quest, and ship something worth sharing.",
    siteName: "Skillin",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Skillin — Build better, together" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Skillin — Build better, together",
    description:
      "Find a complementary collaborator, take on a focused quest, and ship something worth sharing.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  themeColor: "#07110c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-background">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-0 mx-auto h-[34rem] w-[min(100%,72rem)] rounded-full bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),rgba(34,211,238,0.045)_35%,transparent_72%)] opacity-20 blur-3xl"
        />
        <div className="relative z-10 min-h-full">
          <MotionConfig reducedMotion="user">
            <AuthSessionProvider>
              <ProfileProvider>
                <AppShell>{children}</AppShell>
              </ProfileProvider>
              <AppToaster />
            </AuthSessionProvider>
          </MotionConfig>
        </div>
      </body>
    </html>
  );
}
