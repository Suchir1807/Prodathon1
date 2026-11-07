"use client";

export type ProfileStats = {
  sessions: number;
  credits: number;
  rating: number;
};

export function ProfileStatsCard({ stats }: { stats: ProfileStats }) {
  return (
    <aside className="sticky top-20 rounded-xl border border-white/10 bg-[#10182b]/55 p-4 backdrop-blur-xl">
      <p className="text-[11px] tracking-wide text-slate-400 uppercase">Live stats</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-white/8 p-3"><p className="text-[9px] uppercase text-slate-500">Credits</p><p className="mt-1 text-sm font-semibold text-white">{stats.credits}</p></div>
        <div className="rounded-lg border border-white/8 p-3"><p className="text-[9px] uppercase text-slate-500">Sessions</p><p className="mt-1 text-sm font-semibold text-white">{stats.sessions}</p></div>
        <div className="rounded-lg border border-white/8 p-3"><p className="text-[9px] uppercase text-slate-500">Rating</p><p className="mt-1 text-sm font-semibold text-white">{stats.rating ? stats.rating.toFixed(1) : "New"}</p></div>
      </div>
      <p className="mt-3 text-[11px] text-slate-500">Earned activity appears in your public overview.</p>
    </aside>
  );
}
