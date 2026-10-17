"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Handshake, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUsername } from "@/lib/profile";
import { barterSchema, type BarterValues } from "@/lib/validation/schemas";

type Trade = {
  id: string;
  author: { id: string; username: string; displayName: string };
  skillOffered: string;
  skillNeeded: string;
  description: string;
  createdAt: string;
};

async function fetchOpenTrades() {
  const response = await fetch("/api/barters", { cache: "no-store" });
  const data = (await response.json()) as { barters?: Trade[]; error?: string };
  if (!response.ok) throw new Error(data.error ?? "Unable to load open trades.");
  return data.barters ?? [];
}

export function TradingFloor() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const mutationRef = useRef(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BarterValues>({
    resolver: zodResolver(barterSchema),
    mode: "onBlur",
    defaultValues: { skillOffered: "", skillNeeded: "", description: "" },
  });

  useEffect(() => {
    let cancelled = false;
    void fetchOpenTrades()
      .then((items) => {
        if (!cancelled) setTrades(items);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Unable to load open trades.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function postTrade(values: BarterValues) {
    if (mutationRef.current) return;
    mutationRef.current = true;
    setPending("new");
    setFormError("");
    try {
      const response = await fetch("/api/barters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as { barter?: Trade; error?: string };
      if (!response.ok || !data.barter) throw new Error(data.error ?? "Unable to post trade.");
      setTrades((current) => [data.barter!, ...current]);
      reset();
      setModalOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to post trade.");
    } finally {
      setPending(null);
      mutationRef.current = false;
    }
  }

  async function acceptTrade(tradeId: string) {
    if (mutationRef.current) return;
    mutationRef.current = true;
    setPending(tradeId);
    setLoadError("");
    try {
      const response = await fetch(`/api/barters/${tradeId}/accept`, { method: "PUT" });
      const data = (await response.json()) as { workspaceId?: string; error?: string };
      if (!response.ok || !data.workspaceId) throw new Error(data.error ?? "Unable to accept trade.");
      router.push(`/workspace/${data.workspaceId}`);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to accept trade.");
      setPending(null);
      mutationRef.current = false;
    }
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(postTrade)(event);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Trading Floor</h1>
          <p className="mt-1 text-sm text-slate-400">Trade focused bursts of expertise for the skills your build needs.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus /> Post a trade
        </Button>
      </header>

      {loadError ? <p role="alert" className="mb-4 text-sm text-red-300">{loadError}</p> : null}
      {loading ? (
        <p className="flex items-center gap-2 py-12 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" /> Loading open trades…
        </p>
      ) : trades.length ? (
        <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
          {trades.map((trade) => {
            const authorName = trade.author.displayName.trim() || formatUsername(trade.author.username);
            const isOwnTrade = trade.author.id === currentUserId;
            return (
              <article key={trade.id} className="glass mb-4 inline-block w-full break-inside-avoid rounded-lg border border-white/8 p-4">
                <div className="flex items-center gap-2.5">
                  <UserAvatar name={authorName} className="size-9 text-[10px]" />
                  <div className="min-w-0">
                    <Link href={`/profile/${trade.author.id}`} className="block truncate text-sm font-medium text-white hover:text-[#ccff00]">
                      {authorName}
                    </Link>
                    <p className="text-[11px] text-slate-500">@{trade.author.username}</p>
                  </div>
                  <time className="ml-auto shrink-0 text-[10px] text-slate-500" dateTime={trade.createdAt}>
                    {new Date(trade.createdAt).toLocaleDateString()}
                  </time>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <SkillBox label="Offers" value={trade.skillOffered} tone="lime" />
                  <SkillBox label="Needs" value={trade.skillNeeded} tone="blue" />
                </div>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">{trade.description}</p>
                <div className="mt-4 border-t border-white/8 pt-3">
                  <Button
                    size="sm"
                    variant={isOwnTrade ? "outline" : "default"}
                    className={isOwnTrade ? "w-full" : "w-full"}
                    disabled={isOwnTrade || pending !== null}
                    loading={pending === trade.id}
                    onClick={() => void acceptTrade(trade.id)}
                  >
                    {isOwnTrade ? <Handshake /> : <ArrowRight />}
                    {isOwnTrade ? "Your listing" : pending === trade.id ? "Connecting…" : "Accept trade"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="border border-dashed border-white/12 px-5 py-16 text-center">
          <Handshake className="mx-auto size-8 text-slate-600" />
          <h2 className="mt-4 text-base font-medium text-white">No open trades yet</h2>
          <p className="mt-1 text-sm text-slate-400">Put a skill on the floor and name what would move your build forward.</p>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="border border-white/10 bg-[#10182b] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Post a skill trade</DialogTitle>
            <DialogDescription>Offer something useful. Ask for exactly what your project needs next.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submitForm} noValidate>
            <div className="grid gap-2">
              <Label htmlFor="trade-offer">Skill you offer</Label>
              <Input
                id="trade-offer"
                aria-invalid={Boolean(errors.skillOffered)}
                aria-describedby={errors.skillOffered ? "trade-offer-error" : undefined}
                {...register("skillOffered")}
                className={errors.skillOffered ? "border-rose-500/70 focus-visible:ring-rose-500/30" : ""}
              />
              {errors.skillOffered ? <p id="trade-offer-error" className="text-xs font-mono text-rose-500">{errors.skillOffered.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="trade-need">Skill you need</Label>
              <Input
                id="trade-need"
                aria-invalid={Boolean(errors.skillNeeded)}
                aria-describedby={errors.skillNeeded ? "trade-need-error" : undefined}
                {...register("skillNeeded")}
                className={errors.skillNeeded ? "border-rose-500/70 focus-visible:ring-rose-500/30" : ""}
              />
              {errors.skillNeeded ? <p id="trade-need-error" className="text-xs font-mono text-rose-500">{errors.skillNeeded.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="trade-description">Details</Label>
              <textarea
                id="trade-description"
                rows={4}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? "trade-description-error" : undefined}
                {...register("description")}
                className={`resize-y rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#ccff00]/40 ${errors.description ? "border-rose-500/70 focus-visible:ring-rose-500/30" : ""}`}
                placeholder="Describe the specific exchange and time commitment."
              />
              {errors.description ? <p id="trade-description-error" className="text-xs font-mono text-rose-500">{errors.description.message}</p> : null}
            </div>
            {formError ? <p role="alert" className="text-xs text-red-300">{formError}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={pending === "new" || isSubmitting}>{pending === "new" || isSubmitting ? "Posting…" : "Post trade"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SkillBox({ label, value, tone }: { label: string; value: string; tone: "lime" | "blue" }) {
  return (
    <div className={tone === "lime" ? "border border-[#ccff00]/15 bg-[#ccff00]/[0.04] p-2.5" : "border border-sky-400/15 bg-sky-400/[0.04] p-2.5"}>
      <p className="text-[10px] tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={tone === "lime" ? "mt-1 break-words text-sm font-medium text-[#ccff00]" : "mt-1 break-words text-sm font-medium text-sky-200"}>{value}</p>
    </div>
  );
}