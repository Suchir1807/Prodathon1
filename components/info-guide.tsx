"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Bot,
  ChartNoAxesCombined,
  Clock3,
  Code2,
  MessageSquareText,
  NotebookPen,
  Radio,
  UsersRound,
  Workflow,
} from "lucide-react";
import { motion } from "framer-motion";

const GUIDE_CARDS = [
  {
    number: "01",
    title: "The Live ID Card",
    eyebrow: "Your builder profile",
    description:
      "Your profile is your signal to the network. Set up your Skill Graph so CoFoundry can understand what you know, what you want to learn, and match you with the right collaborators.",
    details: [
      "Sprints tracks the builds you have taken on.",
      "Followers and Following show your growing builder network.",
    ],
    icon: ChartNoAxesCombined,
    accent: "emerald",
    href: "/profile",
    linkLabel: "Complete your profile",
  },
  {
    number: "02",
    title: "Emergency Beacons",
    eyebrow: "Find help, fast",
    description:
      "When you need a collaborator now, activate a beacon. It pings local developers in Bengaluru so nearby builders can respond and turn an idea into immediate, real-world collaboration.",
    details: [
      "Share what you need and connect with local talent.",
      "Meet and make progress together, in person.",
    ],
    icon: Radio,
    accent: "cyan",
    href: "/dashboard",
    linkLabel: "Open your dashboard",
  },
  {
    number: "03",
    title: "Flash Builds",
    eyebrow: "Ship under pressure",
    description:
      "Take on a focused sprint with a strict 12-hour countdown. The clock is part of the challenge: you earn the Sprint badge only when you beat the timer and finish in time.",
    details: [
      "Pair up around a concrete build goal.",
      "Finish before the countdown expires to claim your badge.",
    ],
    icon: Clock3,
    accent: "amber",
    href: "/sprint",
    linkLabel: "Explore Flash Builds",
  },
  {
    number: "04",
    title: "Productivity Workspace",
    eyebrow: "Everything in one place",
    description:
      "Every collaboration gets a shared workspace designed to keep the work moving, without switching between a pile of disconnected tools.",
    details: [
      "Capture plans and notes in the shared Markdown scratchpad.",
      "Talk in the live partner chat dock and move work across the drag-and-drop Kanban board.",
    ],
    icon: Workflow,
    accent: "violet",
    href: "/workspace",
    linkLabel: "Open your workspace",
  },
  {
    number: "05",
    title: "Gemini AI Accelerate",
    eyebrow: "A native AI teammate",
    description:
      "Use the native Gemini AI assistant right inside your workspace to explore architecture choices, unblock decisions, and generate code as you build with your partner.",
    details: [
      "Get help reasoning through system design.",
      "Generate code without leaving your collaboration flow.",
    ],
    icon: Bot,
    accent: "fuchsia",
    href: "/workspace",
    linkLabel: "Build with your partner",
  },
] as const;

const ACCENT_STYLES = {
  emerald: {
    icon: "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-300",
    glow: "bg-emerald-400/10",
    number: "text-emerald-300/70",
  },
  cyan: {
    icon: "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-300",
    glow: "bg-cyan-400/10",
    number: "text-cyan-300/70",
  },
  amber: {
    icon: "border-amber-300/20 bg-amber-300/[0.08] text-amber-300",
    glow: "bg-amber-400/10",
    number: "text-amber-300/70",
  },
  violet: {
    icon: "border-violet-300/20 bg-violet-300/[0.08] text-violet-300",
    glow: "bg-violet-400/10",
    number: "text-violet-300/70",
  },
  fuchsia: {
    icon: "border-fuchsia-300/20 bg-fuchsia-300/[0.08] text-fuchsia-300",
    glow: "bg-fuchsia-400/10",
    number: "text-fuchsia-300/70",
  },
} as const;

export function InfoGuide() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 md:px-6 md:py-9">
      <motion.header
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-[#07111a] px-6 py-8 shadow-[0_0_40px_rgba(16,185,129,0.07)] sm:px-9 sm:py-10"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.15),transparent_48%),radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.11),transparent_46%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(rgba(16,185,129,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.16)_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="flex flex-wrap items-start justify-between gap-7">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] text-emerald-300/75 uppercase">
              <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]" />
              CoFoundry field guide
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              How it{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
                works
              </span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              From finding your people to shipping together, here is your
              command center for turning skills into real builds.
            </p>
            <a
              href="#the-platform"
              className="mt-6 inline-flex items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] px-3.5 py-2.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300/40 hover:bg-emerald-300/[0.12]"
            >
              Explore the platform <ArrowDown className="size-3.5" />
            </a>
          </div>

          <div className="grid min-w-[230px] grid-cols-2 gap-2 self-end sm:self-center">
            <div className="rounded-xl border border-white/10 bg-black/25 p-3.5 backdrop-blur-md">
              <UsersRound className="size-4 text-emerald-300" />
              <p className="mt-2 text-[11px] font-medium text-white">Find your people</p>
              <p className="mt-1 text-[10px] text-slate-500">Skill-first matching</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-3.5 backdrop-blur-md">
              <Code2 className="size-4 text-cyan-300" />
              <p className="mt-2 text-[11px] font-medium text-white">Build together</p>
              <p className="mt-1 text-[10px] text-slate-500">Tools in one workspace</p>
            </div>
          </div>
        </div>
      </motion.header>

      <section id="the-platform" aria-labelledby="guide-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-500 uppercase">
              The playbook
            </p>
            <h2 id="guide-heading" className="mt-1 text-lg font-semibold tracking-tight">
              Your path from signal to shipping
            </h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] text-slate-400">
            5 ways to build on CoFoundry
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {GUIDE_CARDS.map((card, index) => {
            const Icon = card.icon;
            const accent = ACCENT_STYLES[card.accent];

            return (
              <motion.article
                key={card.number}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
                className="glow-card group relative isolate overflow-hidden rounded-xl border border-white/10 bg-black/35 p-5 backdrop-blur-md sm:p-6"
              >
                <div
                  className={`pointer-events-none absolute -right-12 -top-12 -z-10 size-36 rounded-full blur-3xl ${accent.glow}`}
                />
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`grid size-11 shrink-0 place-items-center rounded-xl border ${accent.icon}`}
                  >
                    <Icon className="size-5" strokeWidth={1.7} />
                  </div>
                  <span className={`font-mono text-[11px] ${accent.number}`}>
                    GUIDE / {card.number}
                  </span>
                </div>
                <p className="mt-5 text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  {card.eyebrow}
                </p>
                <h3 className="mt-1 text-base font-semibold tracking-tight text-white">
                  {card.title}
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {card.description}
                </p>
                <ul className="mt-4 space-y-2 border-t border-white/[0.07] pt-4">
                  {card.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-2 text-[11px] leading-5 text-slate-300">
                      <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-300/75" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={card.href}
                  className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/80 transition-colors group-hover:text-emerald-200"
                >
                  {card.linkLabel}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </motion.article>
            );
          })}
        </div>
      </section>

      <motion.aside
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-300">
            <MessageSquareText className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">Ready to make your next move?</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Set up your Skill Graph, meet your collaborators, and start building.
            </p>
          </div>
        </div>
        <Link
          href="/find-partners"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/[0.08] px-4 py-2.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-300/[0.14]"
        >
          Find a partner <NotebookPen className="size-3.5" />
        </Link>
      </motion.aside>
    </div>
  );
}
