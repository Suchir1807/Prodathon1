"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Radio, Siren } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type BeaconItem = {
  id: string;
  author: { id: string; username: string; displayName: string };
  eventLocation: string;
  missingSkill: string;
  urgency: "High" | "Critical";
  createdAt: string;
};

export function BeaconCenter() {
  const [beacons, setBeacons] = useState<BeaconItem[]>([]);
  const [open, setOpen] = useState(false);
  const [eventLocation, setEventLocation] = useState("");
  const [missingSkill, setMissingSkill] = useState("");
  const [urgency, setUrgency] = useState<BeaconItem["urgency"]>("High");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/beacons", { cache: "no-store" });
        const data = (await response.json()) as { beacons?: BeaconItem[] };
        if (!cancelled && response.ok) setBeacons(data.beacons ?? []);
      } catch {
        if (!cancelled) setError("Unable to load active beacons.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  async function activate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/beacons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventLocation, missingSkill, urgency }),
      });
      const data = (await response.json()) as { beacon?: BeaconItem; error?: string };
      if (!response.ok || !data.beacon) throw new Error(data.error ?? "Unable to activate beacon.");
      setBeacons((current) => [data.beacon!, ...current]);
      setEventLocation("");
      setMissingSkill("");
      setUrgency("High");
      setOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to activate beacon.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-label="Emergency beacons">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Local emergency beacons</h2>
          <p className="mt-1 text-xs text-slate-400">Active calls for collaborators near an event.</p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="animate-pulse border-red-300/40 bg-red-600 text-white hover:bg-red-500"
        >
          <Siren /> Activate Beacon
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" /> Loading active beacons…
        </div>
      ) : beacons.length ? (
        <div className="flex flex-col gap-2">
          {beacons.map((beacon) => (
            <article
              key={beacon.id}
              className={cn(
                "flex flex-wrap items-center gap-3 border-l-4 px-4 py-3",
                beacon.urgency === "Critical"
                  ? "border-red-400 bg-red-950/60 ring-1 ring-red-500/25"
                  : "border-orange-400 bg-orange-950/45 ring-1 ring-orange-500/20",
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-red-500/15 text-red-200">
                <AlertTriangle className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-white">
                  <span>{beacon.eventLocation}</span>
                  <span className="text-[10px] font-semibold tracking-wide text-red-200 uppercase">
                    {beacon.urgency}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  Needs <strong className="text-white">{beacon.missingSkill}</strong> · posted by{" "}
                  <Link href={`/profile/${beacon.author.id}`} className="text-red-200 underline-offset-2 hover:underline">
                    {beacon.author.displayName.trim() || `@${beacon.author.username}`}
                  </Link>
                </p>
              </div>
              <time className="text-[11px] text-slate-400" dateTime={beacon.createdAt}>
                {new Date(beacon.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </time>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 border border-dashed border-white/10 px-4 py-4 text-sm text-slate-500">
          <Radio className="size-4" />
          {error || "No active beacons. The local channel is clear."}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border border-red-400/20 bg-[#10121c] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Siren className="size-4 text-red-400" /> Activate emergency beacon
            </DialogTitle>
            <DialogDescription>
              Broadcast a local request for help. The beacon expires automatically after 12 hours.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={(event) => void activate(event)}>
            <div className="grid gap-2">
              <Label htmlFor="beacon-event">Event name / location</Label>
              <Input
                id="beacon-event"
                value={eventLocation}
                onChange={(event) => setEventLocation(event.target.value)}
                placeholder="Demo day at Foundry Hall"
                maxLength={120}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="beacon-skill">Required skill</Label>
              <Input
                id="beacon-skill"
                value={missingSkill}
                onChange={(event) => setMissingSkill(event.target.value)}
                placeholder="Live audio engineering"
                maxLength={100}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="beacon-urgency">Urgency</Label>
              <select
                id="beacon-urgency"
                value={urgency}
                onChange={(event) => setUrgency(event.target.value as BeaconItem["urgency"])}
                className="h-9 rounded-lg border border-white/10 bg-[#0a0f1c] px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
              >
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            {error ? <p role="alert" className="text-xs text-red-300">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending} className="border-red-300/40 bg-red-600 text-white hover:bg-red-500">
                {pending ? "Activating…" : "Broadcast beacon"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}