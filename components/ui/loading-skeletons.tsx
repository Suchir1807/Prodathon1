function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md border border-white/[0.06] bg-gradient-to-r from-white/[0.025] via-white/[0.08] to-white/[0.025] ${className}`}
    />
  );
}

export function ProfileSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading profile"
      className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-6 md:px-6 lg:grid-cols-3"
    >
      <div className="space-y-5 lg:col-span-2">
        <div className="space-y-3">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-8 w-64" />
          <Shimmer className="h-4 w-3/4 max-w-xl" />
        </div>
        <div className="flex items-center gap-5 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <Shimmer className="size-24 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-10 w-full" />
          </div>
        </div>
        {["skills-have", "skills-learn", "domains"].map((section) => (
          <section key={section} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <Shimmer className="h-4 w-32" />
            <Shimmer className="mt-2 h-3 w-56" />
            <div className="mt-5 flex flex-wrap gap-2">
              {Array.from({ length: 8 }, (_, index) => (
                <Shimmer key={index} className={`h-7 ${index % 3 === 0 ? "w-24" : "w-16"}`} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <aside className="rounded-xl border border-[#ccff00]/15 bg-[#10182b]/40 p-4">
        <div className="flex items-center justify-between">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-3 w-14" />
        </div>
        <div className="mt-5 flex items-center gap-3">
          <Shimmer className="size-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-3 w-36" />
          </div>
        </div>
        <div className="mt-6 space-y-5">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Shimmer className="h-3 w-20" />
              <div className="flex gap-2"><Shimmer className="h-5 w-16" /><Shimmer className="h-5 w-20" /></div>
            </div>
          ))}
        </div>
        <Shimmer className="mt-7 h-12 w-full" />
      </aside>
      <span className="sr-only">Loading profile details…</span>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading dashboard"
      className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 md:px-6"
    >
      <section className="flex items-center gap-3 border border-red-400/15 bg-red-950/10 px-4 py-4">
        <Shimmer className="size-9 rounded-md" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-4 w-48" />
          <Shimmer className="h-3 w-64 max-w-full" />
        </div>
        <Shimmer className="h-9 w-36" />
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        {["profile-completion", "active-quests"].map((stat) => (
          <article key={stat} className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
            <Shimmer className="h-3 w-32" />
            <Shimmer className="mt-2 h-8 w-16" />
            <Shimmer className="mt-2 h-3 w-44" />
          </article>
        ))}
      </div>
      <section className="min-h-36 rounded-xl border border-white/10 bg-white/[0.025] p-6">
        <Shimmer className="h-4 w-28" />
        <Shimmer className="mt-4 h-5 w-2/3" />
        <Shimmer className="mt-2 h-3 w-40" />
        <Shimmer className="mt-5 h-4 w-28" />
      </section>
      <span className="sr-only">Loading dashboard cards and stats…</span>
    </div>
  );
}

export function TradingFloorSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading open trades"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <article key={index} className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center gap-3">
            <Shimmer className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-3.5 w-32" />
              <Shimmer className="h-3 w-24" />
            </div>
            <Shimmer className="h-3 w-12" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="space-y-2 border border-lime-300/10 p-2.5">
              <Shimmer className="h-3 w-10" /><Shimmer className="h-4 w-24" />
            </div>
            <div className="space-y-2 border border-sky-300/10 p-2.5">
              <Shimmer className="h-3 w-10" /><Shimmer className="h-4 w-20" />
            </div>
          </div>
          <div className="mt-4 space-y-2"><Shimmer className="h-3 w-full" /><Shimmer className="h-3 w-4/5" /></div>
          <Shimmer className="mt-5 h-8 w-full" />
        </article>
      ))}
      <span className="sr-only">Loading trade listings…</span>
    </div>
  );
}

export function WorkspaceSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading shared workspace"
      className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-[1600px] flex-col px-4 py-5 md:px-6"
    >
      <header className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
        <div className="space-y-2"><Shimmer className="h-3 w-20" /><Shimmer className="h-6 w-72" /></div>
        <Shimmer className="h-9 w-28" />
      </header>
      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="space-y-3">
          <Shimmer className="h-5 w-28" />
          <Shimmer className="min-h-[280px] w-full rounded-lg" />
          <div className="flex justify-between"><Shimmer className="h-3 w-20" /><Shimmer className="h-3 w-12" /></div>
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Shimmer className="h-5 w-24" />
            <div className="flex gap-2"><Shimmer className="h-9 w-40" /><Shimmer className="size-9" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["todo", "doing", "done"].map((column) => (
              <div key={column} className="min-h-[280px] space-y-3 border-t border-white/10 pt-3">
                <div className="flex justify-between px-1"><Shimmer className="h-3 w-16" /><Shimmer className="h-3 w-4" /></div>
                {Array.from({ length: 2 }, (_, index) => (
                  <Shimmer key={index} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
      <span className="sr-only">Loading scratchpad and task board…</span>
    </div>
  );
}
