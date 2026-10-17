"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RouteErrorPanel({
  title,
  description,
  diagnostic,
  onRetry,
}: {
  title: string;
  description: string;
  diagnostic?: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[65dvh] max-w-3xl items-center px-4 py-12 md:px-6">
      <section
        aria-labelledby="route-error-title"
        className="w-full rounded-xl border border-red-400/20 bg-[#10182b]/90 p-6 shadow-[0_0_32px_rgba(248,113,113,0.06)] sm:p-8"
      >
        <span className="mb-4 inline-flex size-10 items-center justify-center rounded-lg border border-red-300/20 bg-red-400/10 text-red-300">
          <AlertTriangle aria-hidden="true" className="size-5" />
        </span>
        <p className="font-mono text-[10px] tracking-[0.18em] text-red-300 uppercase">Connection diagnostic</p>
        <h1 id="route-error-title" className="mt-2 text-xl font-semibold text-white sm:text-2xl">{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">{description}</p>
        {diagnostic ? (
          <p className="mt-4 break-all rounded-md border border-white/8 bg-black/20 px-3 py-2 font-mono text-xs text-slate-400">
            Diagnostic ID: {diagnostic}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={onRetry} leadingIcon={<RefreshCw aria-hidden="true" />}>
            Retry connection
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Return to CoFoundry</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
