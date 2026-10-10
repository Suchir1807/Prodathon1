import Link from "next/link";
import { Hexagon } from "lucide-react";

import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  className,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(204,255,0,0.12),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="glass relative w-full max-w-md rounded-2xl border border-white/10 p-8 shadow-[0_0_60px_rgba(0,0,0,0.45)]">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-xl border border-[#ccff00]/35 bg-[#ccff00]/5 text-[#ccff00] shadow-[0_0_24px_rgba(204,255,0,0.15)]">
            <Hexagon className="size-6" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
        </div>
        {children}
        {footer ? (
          <div className="mt-6 border-t border-white/8 pt-6 text-center text-sm text-slate-400">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AuthLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-medium text-[#ccff00] transition hover:text-[#e5ff66]"
    >
      {children}
    </Link>
  );
}
