"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Radio, Siren } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { beaconSchema, type BeaconValues } from "@/lib/validation/schemas";

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
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const submissionRef = useRef(false);
  const previousBeaconsRef = useRef<BeaconItem[] | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BeaconValues>({
    resolver: zodResolver(beaconSchema),
    mode: "onBlur",
    defaultValues: { eventLocation: "", missingSkill: "", urgency: "High" },
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/beacons", { cache: "no-store" });
        const data = (await response.json()) as { beacons?: BeaconItem[] };
        if (!cancelled && response.ok) {
          const nextBeacons = data.beacons ?? [];
          const previousBeacons = previousBeaconsRef.current;
          if (previousBeacons) {
            const activeIds = new Set(nextBeacons.map((beacon) => beacon.id));
            const expired = previousBeacons.filter(
              (beacon) =>
                !activeIds.has(beacon.id) &&
                Date.now() - new Date(beacon.createdAt).getTime() >= 12 * 60 * 60 * 1000,
            );
            for (const beacon of expired) {
              toast.info("Beacon expired", { description: `${beacon.eventLocation} is no longer active.` });
            }
          }
          previousBeaconsRef.current = nextBeacons;
          setBeacons(nextBeacons);
        }
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

  async function activate(values: BeaconValues) {
    if (submissionRef.current) return;
    submissionRef.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/beacons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as { beacon?: BeaconItem; error?: string };
      if (!response.ok || !data.beacon) throw new Error(data.error ?? "Unable to activate beacon.");
      setBeacons((current) => [data.beacon!, ...current]);
      toast.success("Beacon deployed", {
        description: `Request broadcast for ${data.beacon.eventLocation}. It expires in 12 hours.`,
      });
      reset();
      setOpen(false);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to activate beacon.";
      setError(message);
      toast.error("Beacon deployment failed", { description: message });
    } finally {
      setPending(false);
      submissionRef.current = false;
    }
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(activate)(event);
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
          className="animate-pulse border-red-300/40 bg-red-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.5)] transition-transform hover:scale-[1.03] hover:bg-red-500"
        >
          <Siren /> Activate Beacon
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" /> Loading active beacons…
        </div>
      ) : beacons.length ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          className="flex flex-col gap-2"
        >
          <AnimatePresence initial={false}>
          {beacons.map((beacon) => (
            <motion.article
              key={beacon.id}
              layout
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0 },
              }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              whileHover={{ scale: 1.015 }}
              className={cn(
                "flex flex-wrap items-center gap-3 border-l-4 px-4 py-3 transition-shadow hover:shadow-[0_0_22px_rgba(248,113,113,0.1)]",
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
            </motion.article>
          ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="relative isolate flex min-h-28 items-center overflow-hidden rounded-xl border border-dashed border-emerald-400/15 bg-[#070d16] px-5 py-4">
          <div className="pointer-events-none absolute right-5 top-1/2 -z-10 size-24 -translate-y-1/2">
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-emerald-400/20"
              animate={{ scale: [0.3, 1.5], opacity: [0.7, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              aria-hidden="true"
              className="absolute inset-3 rounded-full border border-cyan-400/20"
              animate={{ scale: [0.4, 1.35], opacity: [0.65, 0] }}
              transition={{ duration: 2.8, delay: 0.8, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.div
              aria-hidden="true"
              className="absolute inset-6 rounded-full border border-emerald-300/25"
              animate={{ scale: [0.5, 1.2], opacity: [0.6, 0] }}
              transition={{ duration: 2.8, delay: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
            <span className="absolute inset-[42%] rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]" />
          </div>
          <div className="relative flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300">
              <Radio className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-wide text-emerald-200 uppercase">
                {error ? "Radar offline" : "Radar sweeping"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {error || "Local channel clear. Scanning Bengaluru for nearby developers."}
              </p>
            </div>
          </div>
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
          <form className="grid gap-4" onSubmit={submitForm} noValidate>
            <div className="grid gap-2">
              <Label htmlFor="beacon-event">Event name / location</Label>
              <Input
                id="beacon-event"
                placeholder="Demo day at Foundry Hall"
                aria-invalid={Boolean(errors.eventLocation)}
                aria-describedby={errors.eventLocation ? "beacon-event-error" : undefined}
                {...register("eventLocation")}
                className={errors.eventLocation ? "border-rose-500/70 focus-visible:ring-rose-500/30" : ""}
              />
              {errors.eventLocation ? <p id="beacon-event-error" className="text-xs font-mono text-rose-500">{errors.eventLocation.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="beacon-skill">Required skill</Label>
              <Input
                id="beacon-skill"
                placeholder="Live audio engineering"
                aria-invalid={Boolean(errors.missingSkill)}
                aria-describedby={errors.missingSkill ? "beacon-skill-error" : undefined}
                {...register("missingSkill")}
                className={errors.missingSkill ? "border-rose-500/70 focus-visible:ring-rose-500/30" : ""}
              />
              {errors.missingSkill ? <p id="beacon-skill-error" className="text-xs font-mono text-rose-500">{errors.missingSkill.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="beacon-urgency">Urgency</Label>
              <select
                id="beacon-urgency"
                aria-invalid={Boolean(errors.urgency)}
                aria-describedby={errors.urgency ? "beacon-urgency-error" : undefined}
                {...register("urgency")}
                className="h-9 rounded-lg border border-white/10 bg-[#0a0f1c] px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
              >
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
              {errors.urgency ? <p id="beacon-urgency-error" className="text-xs font-mono text-rose-500">{errors.urgency.message}</p> : null}
            </div>
            {error ? <p role="alert" className="text-xs text-red-300">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={pending || isSubmitting} className="border-red-300/40 bg-red-600 text-white hover:bg-red-500">
                {pending || isSubmitting ? "Activating…" : "Broadcast beacon"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}