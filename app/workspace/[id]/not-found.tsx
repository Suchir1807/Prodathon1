import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function WorkspaceNotFound() {
  return (
    <div className="mx-auto flex min-h-[65dvh] max-w-3xl items-center px-4 py-12 md:px-6">
      <section aria-labelledby="workspace-not-found-title" className="w-full rounded-xl border border-amber-300/20 bg-[#10182b]/90 p-6 sm:p-8">
        <span className="mb-4 inline-flex size-10 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10 text-amber-200">
          <TriangleAlert aria-hidden="true" className="size-5" />
        </span>
        <p className="font-mono text-[10px] tracking-[0.18em] text-amber-200 uppercase">Workspace unavailable</p>
        <h1 id="workspace-not-found-title" className="mt-2 text-xl font-semibold text-white sm:text-2xl">This workspace was not found.</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">It may have expired or you may not have access to it.</p>
        <Button asChild className="mt-6">
          <Link href="/workspace"><ArrowLeft aria-hidden="true" /> Back to workspaces</Link>
        </Button>
      </section>
    </div>
  );
}
