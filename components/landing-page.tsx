"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Check,
  Code2,
  Compass,
  Hexagon,
  Layers3,
  Network,
  Sparkles,
  UsersRound,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";

const STEPS = [
  {
    number: "01",
    title: "Match",
    description: "Meet a student whose strengths complement yours.",
    icon: UsersRound,
  },
  {
    number: "02",
    title: "Quest",
    description: "Pick a small, specific idea with a clear finish line.",
    icon: Compass,
  },
  {
    number: "03",
    title: "Build",
    description: "Trade knowledge as you make something together.",
    icon: Code2,
  },
  {
    number: "04",
    title: "Showcase",
    description: "Share the result and the skills you brought to it.",
    icon: ArrowUpRight,
  },
];

export function LandingPage() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-[#07110c] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-56 left-[52%] size-[min(90vw,900px)] -translate-x-1/2 rounded-full bg-emerald-500/[0.12] blur-[140px]" />
        <div className="absolute right-[-18rem] top-[48rem] size-[36rem] rounded-full bg-lime-300/[0.05] blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(217,243,106,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(217,243,106,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_78%)]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/[0.05] bg-[#07110c]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/" aria-label="Skillin home" className="inline-flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl border border-signal/25 bg-signal/[0.08] text-signal">
              <Hexagon className="size-4" />
            </span>
            <span className="font-heading text-base font-semibold tracking-tight text-white">Skillin</span>
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-3 sm:gap-6">
            <Link
              href="#how-it-works"
              className="hidden text-xs font-medium text-slate-400 transition hover:text-white sm:inline-flex"
            >
              How it works
            </Link>
            <Link
              href="/login"
              className="text-xs font-medium text-slate-300 transition hover:text-white sm:text-sm"
            >
              Sign in
            </Link>
            <Button asChild size="sm" className="h-9 px-3.5 sm:px-4">
              <Link href="/signup">
                Join Skillin
                <ArrowRight />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 sm:pb-24 sm:pt-14 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16 lg:px-10 lg:pb-28 lg:pt-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="min-w-0 max-w-2xl"
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 text-[10px] font-semibold tracking-[0.13em] text-emerald-200/85 uppercase">
              <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]" />
              A peer-powered build network for students
            </p>
            <h1 className="mt-6 font-heading text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.99] font-semibold tracking-[-0.06em] text-white">
              Skills grow faster when you{" "}
              <span className="bg-gradient-to-r from-signal via-emerald-200 to-emerald-300 bg-clip-text text-transparent">
                ship together.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
              Find a collaborator who complements your strengths. Turn one shared idea into a focused 3-day quest—and a project you can actually show.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-11 px-5">
                <Link href="/signup">
                  Find your build partner
                  <ArrowRight />
                </Link>
              </Button>
              <Link
                href="#how-it-works"
                className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-xs font-medium text-slate-300 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
              >
                See how it works <ArrowDown className="size-3.5" />
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.08] pt-5 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-2">
                <Check className="size-3.5 text-emerald-300" />
                Learn by making
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="size-3.5 text-emerald-300" />
                Keep the project
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="size-3.5 text-emerald-300" />
                Share what you ship
              </span>
            </div>
          </motion.div>

          <MatchPreview />
        </section>

        <section id="how-it-works" className="scroll-mt-8 border-y border-white/[0.07] bg-black/15">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45 }}
              className="mb-9 flex flex-wrap items-end justify-between gap-5"
            >
              <div>
                <p className="text-[10px] font-semibold tracking-[0.18em] text-signal/80 uppercase">A simple loop, real momentum</p>
                <h2 className="mt-2 max-w-xl font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  From first hello to something shipped.
                </h2>
              </div>
              <p className="max-w-sm text-xs leading-5 text-slate-400 sm:text-sm">
                No endless planning. Just the right people, a clear scope, and room to learn by doing.
              </p>
            </motion.div>

            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.li
                    key={step.number}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.4, delay: index * 0.07 }}
                    className="relative min-h-44 rounded-2xl border border-white/[0.08] bg-[#0c1911]/75 p-5 backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid size-9 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200">
                        <Icon className="size-4" strokeWidth={1.8} />
                      </span>
                      <span className="font-mono text-[10px] text-slate-600">{step.number}</span>
                    </div>
                    <h3 className="mt-7 text-base font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 max-w-[16rem] text-xs leading-5 text-slate-400">{step.description}</p>
                    {index < STEPS.length - 1 ? (
                      <ArrowRight aria-hidden="true" className="absolute -right-3 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full border border-white/10 bg-[#07110c] p-0.5 text-emerald-200 lg:block" />
                    ) : null}
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </section>

        <section id="why-skillin" className="scroll-mt-8 mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
            <div className="max-w-md">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-emerald-200/75 uppercase">Better than building alone</p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Trade skills. Not just links.
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Skillin makes collaboration the learning path. Bring what you know, meet someone with a different edge, and leave with a shared result.
              </p>
              <Link
                href="/info"
                className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-emerald-200 transition hover:text-signal"
              >
                Explore the field guide <ArrowUpRight className="size-3.5" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Feature
                icon={Network}
                label="01 / Find your people"
                title="Skills that fit together"
                description="Show what you can do and what you want to learn. Find a collaborator who brings a complementary point of view."
                className="sm:row-span-2"
              />
              <Feature
                icon={Zap}
                label="02 / Make it manageable"
                title="A 3-day quest"
                description="Keep the scope small, the deadline clear, and the momentum real."
              />
              <Feature
                icon={Layers3}
                label="03 / Stay in the flow"
                title="One shared workspace"
                description="Plan, track tasks, chat, and keep notes together while you build."
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 sm:pb-20 lg:px-10">
          <div className="relative isolate overflow-hidden rounded-3xl border border-emerald-200/15 bg-[#0c1911] px-6 py-10 sm:px-10 sm:py-12">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_0%,rgba(217,243,106,0.12),transparent_42%),radial-gradient(ellipse_at_0%_100%,rgba(16,185,129,0.1),transparent_45%)]" />
            <div className="flex flex-col items-start justify-between gap-7 sm:flex-row sm:items-center">
              <div className="max-w-xl">
                <p className="text-[10px] font-semibold tracking-[0.18em] text-signal/80 uppercase">Your next project can start here</p>
                <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Bring a skill. Leave with a story.
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Create your profile, find your people, and start making something real.
                </p>
              </div>
              <Button asChild size="lg" className="h-11 shrink-0 px-5">
                <Link href="/signup">Create your account <ArrowRight /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <Link href="/" className="inline-flex items-center gap-2 font-medium text-slate-300">
            <Hexagon className="size-3.5 text-emerald-300" />
            Skillin
          </Link>
          <p>Learn together. Make something that matters.</p>
          <div className="flex items-center gap-4">
            <Link href="/info" className="transition hover:text-white">How it works</Link>
            <Link href="/login" className="transition hover:text-white">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MatchPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.1, ease: "easeOut" }}
      className="relative mx-auto w-full min-w-0 max-w-[590px]"
      aria-label="Illustration of complementary skills coming together in a three-day build"
      role="img"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-8 rounded-full bg-emerald-400/[0.08] blur-3xl" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b1710]/90 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/40 to-transparent" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold tracking-[0.18em] text-emerald-200/70 uppercase">A better kind of match</p>
            <h2 className="mt-1 text-sm font-semibold text-white">Different strengths. One build.</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-2.5 py-1.5 text-[9px] font-medium text-emerald-100">
            <Sparkles className="size-3" />
            Skill fit
          </span>
        </div>

        <div className="relative mt-7 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:p-4"
          >
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-emerald-200">
                <Blocks className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] text-slate-500">YOU BRING</p>
                <p className="truncate text-xs font-semibold text-white">Product thinking</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <SkillChip>UX flows</SkillChip>
              <SkillChip>Prototyping</SkillChip>
            </div>
          </motion.div>

          <div className="relative z-10 grid size-9 place-items-center rounded-full border border-signal/20 bg-[#111c13] text-signal shadow-[0_0_30px_rgba(217,243,106,0.12)] sm:size-11">
            <Network className="size-4 sm:size-5" />
          </div>

          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
            className="min-w-0 rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.045] p-3 sm:p-4"
          >
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-sky-300/10 text-sky-200">
                <Code2 className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] text-slate-500">THEY BRING</p>
                <p className="truncate text-xs font-semibold text-white">Frontend craft</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <SkillChip>React</SkillChip>
              <SkillChip>Motion</SkillChip>
            </div>
          </motion.div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/20 p-3.5 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg border border-signal/15 bg-signal/[0.06] text-signal">
                <Zap className="size-3.5" />
              </span>
              <div>
                <p className="text-[9px] font-semibold tracking-[0.12em] text-slate-500 uppercase">Your 3-day quest</p>
                <p className="mt-0.5 text-xs font-medium text-slate-200">Prototype a campus event finder</p>
              </div>
            </div>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] text-slate-400">A small scope. A real outcome.</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {["Align", "Build", "Showcase"].map((stage, index) => (
              <div key={stage} className="relative">
                <div className="mb-2 flex items-center gap-1.5">
                  <span className={`grid size-5 place-items-center rounded-full border text-[9px] ${index === 0 ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-white/10 text-slate-500"}`}>
                    {index === 0 ? <Check className="size-3" /> : index + 1}
                  </span>
                  <span className={`text-[9px] sm:text-[10px] ${index === 0 ? "text-emerald-100" : "text-slate-500"}`}>{stage}</span>
                </div>
                <div className={`h-1 rounded-full ${index === 0 ? "bg-emerald-300/70" : "bg-white/[0.08]"}`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 left-3 hidden items-center gap-2 rounded-xl border border-white/10 bg-[#0c1911]/95 px-3 py-2 shadow-xl sm:flex">
        <span className="grid size-7 place-items-center rounded-lg bg-emerald-300/10 text-emerald-200">
          <Check className="size-3.5" />
        </span>
        <span className="text-[10px] font-medium text-slate-200">Built by both of you</span>
      </div>
    </motion.div>
  );
}

function SkillChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-[9px] text-slate-300">
      {children}
    </span>
  );
}

function Feature({
  icon: Icon,
  label,
  title,
  description,
  className,
}: {
  icon: typeof Network;
  label: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4 }}
      className={`glow-card rounded-2xl border border-white/[0.08] bg-[#0c1911]/70 p-5 backdrop-blur-md ${className ?? ""}`}
    >
      <span className="grid size-9 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200">
        <Icon className="size-4" strokeWidth={1.8} />
      </span>
      <p className="mt-5 text-[9px] font-semibold tracking-[0.14em] text-emerald-200/65 uppercase">{label}</p>
      <h3 className="mt-1 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-slate-400">{description}</p>
    </motion.article>
  );
}
