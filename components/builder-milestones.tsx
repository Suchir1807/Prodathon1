import { BadgeCheck, LockKeyhole } from "lucide-react";

import type { Profile } from "@/lib/types";

export function BuilderMilestones({
  profile,
  questCount,
}: {
  profile: Profile;
  questCount: number;
}) {
  const milestones = [
    {
      label: "Skill graph live",
      detail: "List one skill to teach and one to learn",
      earned: profile.canTeach.length > 0 && profile.wantsToLearn.length > 0,
    },
    {
      label: "First quest accepted",
      detail: "Start a focused build with a partner",
      earned: questCount > 0,
    },
    {
      label: "Three quests",
      detail: `${Math.min(questCount, 3)} of 3 quests accepted`,
      earned: questCount >= 3,
    },
  ];

  return (
    <section
      aria-label="Builder milestones"
      className="mt-4 rounded-2xl border border-white/[0.07] bg-slate-950/35 p-3 sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
          Builder milestones
        </h2>
        <span className="text-[10px] text-slate-500">Earned from your real activity</span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-3">
        {milestones.map((milestone) => {
          const Icon = milestone.earned ? BadgeCheck : LockKeyhole;
          return (
            <li
              key={milestone.label}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                milestone.earned
                  ? "border-emerald-300/15 bg-emerald-300/[0.045]"
                  : "border-white/[0.06] bg-white/[0.02]"
              }`}
            >
              <Icon
                className={`size-4 shrink-0 ${milestone.earned ? "text-emerald-200" : "text-slate-600"}`}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className={`block truncate text-[11px] font-medium ${milestone.earned ? "text-emerald-50" : "text-slate-400"}`}>
                  {milestone.label}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                  {milestone.earned ? "Milestone earned" : milestone.detail}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
