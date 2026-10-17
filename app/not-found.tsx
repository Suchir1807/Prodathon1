import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[65dvh] max-w-3xl items-center px-4 py-12 md:px-6">
      <section aria-labelledby="not-found-title" className="w-full rounded-xl border border-white/10 bg-[#10182b]/85 p-6 sm:p-8">
        <span className="mb-4 inline-flex size-10 items-center justify-center rounded-lg border border-[#ccff00]/20 bg-[#ccff00]/[0.07] text-[#ccff00]">
          <SearchX aria-hidden="true" className="size-5" />
        </span>
        <p className="font-mono text-[10px] tracking-[0.18em] text-[#ccff00] uppercase">404 / route unavailable</p>
        <h1 id="not-found-title" className="mt-2 text-xl font-semibold text-white sm:text-2xl">This page is off the map.</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">The page may have moved, expired, or never existed.</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard"><ArrowLeft aria-hidden="true" /> Return to dashboard</Link>
        </Button>
      </section>
    </div>
  );
}
