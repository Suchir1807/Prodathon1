function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md border border-border bg-gradient-to-r from-muted/70 via-accent/70 to-muted/70 ${className}`}
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
