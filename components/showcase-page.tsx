"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Clipboard, Sparkles, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { useProfile } from "@/components/profile-provider";
import { Button } from "@/components/ui/button";
import type { AcceptedQuest, Quest } from "@/lib/types";

type ShowcaseStory = {
  title: string;
  tagline: string;
  summary: string;
  partnerName: string;
  startedAt: string;
  stack: string[];
  successCriteria: string[];
  contributors: string[];
  skills: string[];
};

const DEMO_STORY: ShowcaseStory = {
  title: "Campus Skill Exchange",
  tagline: "A better way to find the teammate your next idea needs.",
  summary:
    "A lightweight matching experience that turns complementary student skills into focused, three-day build quests.",
  partnerName: "Aarav Mehta",
  startedAt: "",
  stack: ["Next.js", "TypeScript", "MongoDB", "Tailwind CSS"],
  successCriteria: [
    "Build a profile around teachable skills and learning goals",
    "Surface collaborators with complementary strengths",
    "Turn a match into a clear, time-boxed project brief",
  ],
  contributors: ["Mira Iyer", "Aarav Mehta"],
  skills: ["Product design", "React", "API design", "Prototyping"],
};

function subscribeToLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function getLocationSearch() {
  return window.location.search;
}

function getServerLocationSearch() {
  return "";
}

function fromAcceptedQuest(accepted: AcceptedQuest): ShowcaseStory {
  const quest: Quest = accepted.quest;
  return {
    title: quest.title,
    tagline: quest.tagline,
    summary: quest.summary,
    partnerName: accepted.partnerName,
    startedAt: accepted.acceptedAt,
    stack: quest.stack,
    successCriteria: quest.successCriteria,
    contributors: [quest.studentA.name, quest.studentB.name],
    skills: [quest.studentA.focus, quest.studentB.focus],
  };
}

function isString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function isStringList(value: unknown, maxItems: number, maxLength: number): value is string[] {
  return Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => isString(item, maxLength));
}

function parseStory(value: string): ShowcaseStory | null {
  if (value.length > 10_000) return null;
  try {
    const data: unknown = JSON.parse(value);
    if (!data || typeof data !== "object") return null;
    const story = data as Record<string, unknown>;
    if (
      !isString(story.title, 160) ||
      !isString(story.tagline, 240) ||
      !isString(story.summary, 800) ||
      !isString(story.partnerName, 80) ||
      !isString(story.startedAt, 64) ||
      !isStringList(story.stack, 12, 48) ||
      !isStringList(story.successCriteria, 8, 240) ||
      !isStringList(story.contributors, 4, 80) ||
      !isStringList(story.skills, 12, 80)
    ) {
      return null;
    }

    return {
      title: story.title,
      tagline: story.tagline,
      summary: story.summary,
      partnerName: story.partnerName,
      startedAt: story.startedAt,
      stack: story.stack,
      successCriteria: story.successCriteria,
      contributors: story.contributors,
      skills: story.skills,
    };
  } catch {
    return null;
  }
}

function dateLabel(date: string) {
  const value = new Date(date);
  return Number.isNaN(value.getTime())
    ? "Date not available"
    : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value);
}

export function ShowcasePage() {
  const { quests } = useProfile();
  const search = useSyncExternalStore(
    subscribeToLocation,
    getLocationSearch,
    getServerLocationSearch,
  );
  const { story, isSample, invalidStory } = useMemo(() => {
    const params = new URLSearchParams(search);
    const shared = params.get("story");
    if (shared) {
      const parsed = parseStory(shared);
      return {
        story: parsed ?? DEMO_STORY,
        isSample: !parsed || params.get("demo") === "1",
        invalidStory: parsed === null,
      };
    }

    return {
      story: quests[0] ? fromAcceptedQuest(quests[0]) : DEMO_STORY,
      isSample: !quests[0],
      invalidStory: false,
    };
  }, [quests, search]);
  const [copyError, setCopyError] = useState("");

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams({ story: JSON.stringify(story) });
    if (isSample) params.set("demo", "1");
    return `${window.location.origin}/showcase?${params.toString()}`;
  }, [isSample, story]);

  async function copyStoryLink() {
    setCopyError("");
    try {
      if (shareUrl.length > 6000) {
        throw new Error("This story is too large to share as a link.");
      }
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Showcase link copied", { description: "Anyone with the link can view this project story." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not copy the showcase link.";
      setCopyError(message);
      toast.error("Could not copy link", { description: message });
    }
  }

  return (
    <main className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-[#07110c] px-4 py-8 text-white sm:px-7 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.12),transparent_48%)]" />
      <div className="relative mx-auto max-w-5xl">
        <header className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-emerald-200/75 uppercase">
              <Sparkles className="size-3.5" />
              Project showcase
            </p>
            <h1 className="mt-3 max-w-3xl font-heading text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              A small team. A real thing shipped.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              A shareable snapshot of the idea, collaborators, and skills behind a Skillin quest.
            </p>
          </div>
          <Button type="button" onClick={() => void copyStoryLink()} className="shrink-0">
            <Clipboard />
            Copy showcase link
          </Button>
        </header>

        {invalidStory ? (
          <p role="alert" className="mt-4 text-sm text-rose-300">
            This showcase link is incomplete or invalid. Here’s a sample story instead.
          </p>
        ) : null}
        {copyError ? <p role="alert" className="mt-2 text-sm text-rose-300">{copyError}</p> : null}

        <article className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 shadow-[0_24px_100px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          <div className="border-b border-white/[0.07] bg-white/[0.025] px-5 py-5 sm:px-8 sm:py-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-2.5 py-1 text-[10px] font-medium text-emerald-100">
                {isSample ? "Sample preview" : "Quest snapshot"}
              </span>
              {story.startedAt && !isSample ? (
                <time dateTime={story.startedAt} className="text-[11px] text-slate-500">
                  Started {dateLabel(story.startedAt)}
                </time>
              ) : null}
            </div>
            <h2 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {story.title}
            </h2>
            <p className="mt-2 text-sm font-medium text-emerald-100/85">{story.tagline}</p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{story.summary}</p>
          </div>

          <div className="grid gap-0 md:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-7 p-5 sm:p-8">
              <section aria-labelledby="showcase-skills">
                <h3 id="showcase-skills" className="text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  Skills in the room
                </h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {story.skills.map((skill) => (
                    <li key={skill} className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-1.5 text-xs text-emerald-50/90">
                      {skill}
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="showcase-stack">
                <h3 id="showcase-stack" className="text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  Tools & stack
                </h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {story.stack.map((item) => (
                    <li key={item} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-slate-300">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="showcase-outcome">
                <h3 id="showcase-outcome" className="text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  What we set out to build
                </h3>
                <ul className="mt-3 space-y-3">
                  {story.successCriteria.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-slate-300">
                      <Check className="mt-1 size-4 shrink-0 text-emerald-200" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-slate-500">
                  Quest success criteria — not a claim that each milestone is complete.
                </p>
              </section>
            </div>

            <aside className="space-y-6 border-t border-white/[0.07] bg-white/[0.02] p-5 md:border-t-0 md:border-l sm:p-8">
              <section>
                <h3 className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                  <UsersRound className="size-3.5" />
                  Built with
                </h3>
                <p className="mt-3 text-lg font-semibold text-white">{story.partnerName}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {story.contributors.filter(Boolean).join(" · ") || "Two builders, one shared goal"}
                </p>
              </section>

              <section className="rounded-2xl border border-white/[0.07] bg-slate-950/50 p-4">
                <h3 className="text-sm font-semibold text-white">Partner reflections</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  No reviews have been added to this story yet. Feedback belongs to the people who built together.
                </p>
              </section>

              {isSample ? (
                <p className="text-[11px] leading-5 text-slate-500">
                  This is a clearly labeled sample preview. Accept a quest to create a showcase from your own project brief.
                </p>
              ) : null}
            </aside>
          </div>
        </article>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4">
          <div>
            <p className="text-sm font-medium text-white">Ready to build your next one?</p>
            <p className="mt-1 text-xs text-slate-500">Find a collaborator whose skills complement yours.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/find-partners">
              Find a collaborator <ArrowUpRight />
            </Link>
          </Button>
        </footer>
      </div>
    </main>
  );
}
