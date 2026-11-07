"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  ChartNoAxesCombined,
  Clock3,
  Code2,
  MessageSquareText,
  NotebookPen,
  UsersRound,
  Workflow,
} from "lucide-react";
import { motion } from "framer-motion";

const GUIDE_CARDS = [
  {
    number: "01",
    title: "Offer & Want",
    eyebrow: "Your Profile",
    description:
      "Share skills you can offer and skills you want to learn so peers can find a useful match.",
    details: [
      "Keep your offered and wanted skills up to date.",
      "Earn verified skill badges through peer reviews.",
    ],
    icon: ChartNoAxesCombined,
    accent: "emerald",
    href: "/profile",
    linkLabel: "Edit your Profile",
  },
  {
    number: "02",
    title: "Match or Ask",
    eyebrow: "Find your learning partner",
    description:
      "Find a peer with complementary skills, or publish an Ask that explains what you can offer and want to learn.",
    details: [
      "Compare overlapping interests and useful skill swaps.",
      "Accept an Ask to arrange a learning Session.",
    ],
    icon: UsersRound,
    accent: "cyan",
    href: "/find-partners",
    linkLabel: "Find a partner",
  },
  {
    number: "03",
    title: "Book a Session",
    eyebrow: "Make time to learn",
    description:
      "Choose a topic, partner, time, and duration. Your time credits reserve the learner's place and reward the teacher when the Session is complete.",
    details: [
      "One time credit represents one minute of learning.",
      "Cancel a scheduled Session to return reserved credits.",
    ],
    icon: Clock3,
    accent: "amber",
    href: "/sessions",
    linkLabel: "View Sessions",
  },
  {
    number: "04",
    title: "Learn & Teach",
    eyebrow: "Learn together",
    description:
      "Meet regularly and use your Session room for private chat and shared notes.",
    details: [
      "Keep your scheduled Sessions and notes together.",
      "Continue conversations in Messages.",
    ],
    icon: Workflow,
    accent: "violet",
    href: "/sessions",
    linkLabel: "View Sessions",
  },
  {
    number: "05",
    title: "Review & Grow",
    eyebrow: "Recognize what you learn",
    description:
      "After a completed Session, leave thoughtful feedback and recognize skills your partner shared. Reviews contribute verified skills and badges to the Profile.",
    details: [
      "Rate the experience and leave useful feedback.",
      "Make learning progress visible to your community.",
    ],
    icon: BadgeCheck,
    accent: "fuchsia",
    href: "/profile",
    linkLabel: "View your Profile",
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
              Skillin field guide
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              How it{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
                works
              </span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Offer & Want → Match or Ask → Book a Session → Learn & Teach → Review & Grow.
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
              <p className="mt-2 text-[11px] font-medium text-white">Learn & teach</p>
              <p className="mt-1 text-[10px] text-slate-500">A peer-led exchange</p>
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
              The Skillin learning loop
            </h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] text-slate-400">
            5 steps to grow with Skillin
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
              Set up your Profile, meet a learning partner, and start sharing skills.
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
