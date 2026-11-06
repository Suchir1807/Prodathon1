import Link from "next/link";
import {
  ArrowUpRight,
  Code2,
  Hexagon,
  Layers3,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Match", icon: UsersRound },
  { label: "Quest", icon: Sparkles },
  { label: "Build", icon: Code2 },
  { label: "Showcase", icon: Layers3 },
];

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
        "relative min-h-dvh overflow-hidden bg-background text-foreground",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-36 -top-40 size-[34rem] rounded-full bg-emerald-500/[0.08] blur-3xl"
      />
      <main className="relative mx-auto grid min-h-dvh max-w-[1600px] grid-cols-1 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <aside className="relative isolate flex min-h-[350px] flex-col overflow-hidden bg-forest-950 px-6 py-6 text-white sm:px-10 sm:py-9 lg:min-h-dvh lg:px-14 lg:py-12">
          <div
            aria-hidden="true"
            className="aurora-drift pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_18%_82%,rgba(16,185,129,0.18),transparent_42%),radial-gradient(ellipse_at_82%_16%,rgba(217,243,106,0.10),transparent_34%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12] [background-image:linear-gradient(rgba(205,224,204,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(205,224,204,0.2)_1px,transparent_1px)] [background-size:44px_44px]"
          />

          <Link
            href="/"
            aria-label="Skillin home"
            className="flex w-fit items-center gap-2.5 rounded-lg text-white focus-visible:outline-white"
          >
            <span className="grid size-9 place-items-center rounded-xl border border-emerald-200/20 bg-emerald-100/[0.08] text-signal shadow-[0_0_26px_rgba(217,243,106,0.1)]">
              <Hexagon className="size-[18px]" strokeWidth={1.8} />
            </span>
            <span className="font-heading text-lg font-semibold tracking-tight">Skillin</span>
          </Link>

          <div className="relative z-10 mt-12 max-w-2xl sm:mt-16 lg:mt-[clamp(4rem,12vh,9rem)]">
            <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] text-emerald-200/75 uppercase">
              <span className="size-1.5 rounded-full bg-signal shadow-[0_0_12px_rgba(217,243,106,0.8)]" />
              A studio for learning by doing
            </p>
            <h1 className="mt-4 max-w-xl font-heading text-4xl leading-[1.03] font-medium tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
              Your next skill might be{" "}
              <span className="text-signal">a person away.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-emerald-50/65 sm:text-base sm:leading-7">
              Trade what you know for what you want to learn. Find a builder,
              make something real, and leave with proof of what you can do.
            </p>
          </div>

          <ol
            aria-label="How Skillin works"
            className="relative z-10 mt-9 grid max-w-2xl grid-cols-4 gap-2 sm:mt-11 sm:gap-4"
          >
            {STEPS.map(({ label, icon: Icon }, index) => (
              <li key={label} className="relative min-w-0">
                {index < STEPS.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-[calc(50%+1.15rem)] right-[calc(-50%+1.15rem)] top-4 h-px bg-gradient-to-r from-emerald-300/40 to-emerald-300/10 sm:left-[calc(50%+1.35rem)] sm:right-[calc(-50%+1.35rem)]"
                  />
                ) : null}
                <span className="relative grid size-8 place-items-center rounded-full border border-emerald-200/20 bg-emerald-100/[0.07] text-emerald-100/80 sm:size-9">
                  <Icon aria-hidden="true" className="size-3.5" />
                </span>
                <span className="mt-2 block truncate text-[10px] font-medium text-emerald-50/70 sm:text-xs">
                  {label}
                </span>
              </li>
            ))}
          </ol>

          <div className="relative z-10 mt-10 hidden max-w-xl rounded-2xl border border-emerald-100/10 bg-white/[0.035] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.2)] backdrop-blur-xl lg:block">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-medium tracking-[0.16em] text-emerald-100/45 uppercase">
                  Better together
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  Different strengths. One shared build.
                </p>
              </div>
              <span className="grid size-8 shrink-0 place-items-center rounded-full border border-signal/20 bg-signal/10 text-signal">
                <ArrowUpRight className="size-4" />
              </span>
            </div>
            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="rounded-xl border border-emerald-100/10 bg-forest-900/80 p-3">
                <span className="grid size-8 place-items-center rounded-lg bg-emerald-300/10 text-xs font-semibold text-emerald-200">A</span>
                <p className="mt-3 text-xs font-medium text-white">Frontend craft</p>
                <p className="mt-1 text-[10px] text-emerald-50/45">Can teach React</p>
              </div>
              <span aria-hidden="true" className="h-px w-8 bg-gradient-to-r from-emerald-300/20 via-signal/70 to-emerald-300/20" />
              <div className="rounded-xl border border-signal/15 bg-signal/[0.045] p-3">
                <span className="grid size-8 place-items-center rounded-lg bg-signal/10 text-xs font-semibold text-signal">B</span>
                <p className="mt-3 text-xs font-medium text-white">Product thinking</p>
                <p className="mt-1 text-[10px] text-emerald-50/45">Wants to learn UX</p>
              </div>
            </div>
          </div>

          <p className="relative z-10 mt-auto hidden pt-10 text-[10px] tracking-wide text-emerald-50/35 lg:block">
            BUILT FOR CURIOUS PEOPLE WHO SHIP
          </p>
        </aside>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
          <div className="w-full max-w-[420px]">
            <div className="mb-8">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-success uppercase">
                Your builder space
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
            </div>
            {children}
            {footer ? (
              <div className="mt-7 border-t border-border pt-5 text-sm text-muted-foreground">
                {footer}
              </div>
            ) : null}
            <p className="mt-8 text-center text-[10px] leading-5 text-muted-foreground/70">
              Your profile is yours. Your next build is better together.
            </p>
          </div>
        </section>
      </main>
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
      className="font-semibold text-success underline-offset-4 transition hover:text-emerald-300 hover:underline"
    >
      {children}
    </Link>
  );
}
