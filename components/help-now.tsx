"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, HandHelping, LoaderCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const HELP_NOW_EVENT = "skillin:help-now";

export function HelpNowButton({ className = "" }: { className?: string }) {
  return (
    <Button
      type="button"
      onClick={() => window.dispatchEvent(new Event(HELP_NOW_EVENT))}
      className={className}
    >
      <HandHelping className="size-4" />Help Now
    </Button>
  );
}

type HelpRequestStatus = {
  id: string;
  category: string;
  skill: string;
  difficulty: string;
  helperBrief: string;
  searchTags: string[];
  quickAnswer: string;
  status: string;
  attempts: number;
  candidateCount: number;
  currentHelper: { name: string; offerExpiresAt: string | null } | null;
  sessionId: string | null;
  roomId: string | null;
  recap: string;
  practiceSteps: string[];
};

type IncomingOffer = {
  id: string;
  requestId: string;
  expiresAt: string;
  category: string;
  skill: string;
  difficulty: string;
  helperBrief: string;
  durationMinutes: number;
  requester: { name: string };
};

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

export function HelpNowController() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState("");
  const [urgency, setUrgency] = useState<"now" | "within_hour">("now");
  const [durationMinutes, setDurationMinutes] = useState<15 | 30>(15);
  const [request, setRequest] = useState<HelpRequestStatus | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<IncomingOffer | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  const pollRequest = useCallback(async (id: string) => {
    const data = await apiJson<{ request: HelpRequestStatus }>(`/api/help-now/requests/${id}`);
    setRequest(data.request);
    if (data.request.status === "matched" && data.request.roomId) {
      router.push(`/session-room/${data.request.roomId}`);
    }
  }, [router]);

  const pollOffer = useCallback(async () => {
    try {
      const data = await apiJson<{ offer: IncomingOffer | null }>("/api/help-now/offers");
      setIncomingOffer(data.offer);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to check incoming offers.");
    }
  }, []);

  useEffect(() => {
    const openModal = () => {
      setOpen(true);
      setError("");
    };
    window.addEventListener(HELP_NOW_EVENT, openModal);
    return () => window.removeEventListener(HELP_NOW_EVENT, openModal);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void pollOffer();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [pollOffer]);

  useEffect(() => {
    const heartbeat = () => {
      if (document.visibilityState === "visible") void fetch("/api/availability/heartbeat", { method: "POST" });
    };
    heartbeat();
    const timer = window.setInterval(heartbeat, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!request || !["searching", "offered"].includes(request.status)) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void pollRequest(request.id);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [pollRequest, request]);

  useEffect(() => {
    if (!open || problem.trim().length < 3) {
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const data = await apiJson<{ count: number }>(`/api/help-now/online-count?q=${encodeURIComponent(problem.trim())}`);
        if (active) setOnlineCount(data.count);
      } catch {
        if (active) setOnlineCount(null);
      }
    }, 450);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, problem]);

  useEffect(() => {
    if (!incomingOffer) return;
    const update = () => setCountdown(Math.max(0, Math.ceil((new Date(incomingOffer.expiresAt).getTime() - Date.now()) / 1000)));
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [incomingOffer]);

  async function startRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (starting || !problem.trim()) return;
    setStarting(true);
    setError("");
    setRequest(null);
    try {
      const data = await apiJson<{ request: HelpRequestStatus }>("/api/help-now/requests", {
        method: "POST",
        body: JSON.stringify({ problem, urgency, durationMinutes }),
      });
      setRequest(data.request);
      setOnlineCount(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start Help Now.");
    } finally {
      setStarting(false);
    }
  }

  async function cancelRequest() {
    if (!request) return;
    try {
      await apiJson(`/api/help-now/requests/${request.id}`, { method: "DELETE" });
      setRequest({ ...request, status: "cancelled" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to cancel request.");
    }
  }

  async function postAsAsk() {
    if (!request) return;
    setResponding(true);
    try {
      const profile = await apiJson<{ skillsHave: string[] }>("/api/profile");
      await apiJson("/api/asks", {
        method: "POST",
        body: JSON.stringify({
          skillOffered: profile.skillsHave[0] ?? "Peer support",
          skillWanted: request.skill,
          note: `${problem.trim()}${problem.trim().length < 10 ? " I would appreciate practical guidance." : ""}`,
        }),
      });
      setOpen(false);
      setRequest(null);
      router.push("/asks");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to post this as an Ask.");
    } finally {
      setResponding(false);
    }
  }

  async function respondToOffer(action: "accept" | "decline") {
    if (!incomingOffer || responding) return;
    setResponding(true);
    setError("");
    try {
      const data = await apiJson<{ roomUrl: string | null }>(`/api/help-now/offers/${incomingOffer.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      setIncomingOffer(null);
      if (data.roomUrl) router.push(data.roomUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to respond to offer.");
      if (action === "decline") setIncomingOffer(null);
    } finally {
      setResponding(false);
    }
  }

  function closeModal(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && request && ["searching", "offered"].includes(request.status)) void cancelRequest();
    if (!nextOpen && request && ["no_match", "cancelled", "completed"].includes(request.status)) setRequest(null);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={closeModal}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto border-white/10 bg-[#07110c]/95 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>What do you need help with?</DialogTitle>
            <DialogDescription className="text-slate-400">Get quick peer help with any skill, plus an immediate AI first response.</DialogDescription>
          </DialogHeader>
          {!request ? (
            <form onSubmit={(event) => void startRequest(event)} className="space-y-4">
              <label className="block text-xs text-slate-300">Describe the problem
                <textarea autoFocus value={problem} onChange={(event) => setProblem(event.target.value)} minLength={5} maxLength={1000} rows={4} required placeholder="My sourdough isn't rising…" className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white placeholder:text-slate-600" />
              </label>
              <p className="text-[11px] text-slate-500">A 15- or 30-minute session uses that many credits. Teach a skill to earn more, or post an Ask to find a learning partner.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-slate-400">Urgency<select value={urgency} onChange={(event) => setUrgency(event.target.value as "now" | "within_hour")} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#07110c] px-3 py-2 text-sm text-white"><option value="now">Now</option><option value="within_hour">Within an hour</option></select></label>
                <label className="text-xs text-slate-400">Session length<select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value) as 15 | 30)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#07110c] px-3 py-2 text-sm text-white"><option value={15}>15 minutes</option><option value={30}>30 minutes</option></select></label>
              </div>
              {onlineCount !== null ? <p className="text-xs text-emerald-200">{onlineCount} {onlineCount === 1 ? "person" : "people"} online who can help with this</p> : null}
              {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
              <Button type="submit" loading={starting} disabled={problem.trim().length < 5}><HandHelping />Find a helper</Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-xs text-emerald-200"><Sparkles className="size-4" />{request.category} · {request.skill} · {request.difficulty}</div>
                <p className="mt-2 text-sm text-slate-300">{request.helperBrief}</p>
              </div>
              <section className="rounded-xl border border-sky-300/15 bg-sky-300/[0.04] p-4">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-sky-100"><Sparkles className="size-3.5" />Quick answer</h3>
                <p className="mt-2 text-sm leading-6 text-slate-200">{request.quickAnswer}</p>
              </section>
              {request.status === "searching" || request.status === "offered" ? (
                <div className="rounded-xl border border-white/10 p-4">
                  <p className="flex items-center gap-2 text-sm text-white"><LoaderCircle className="size-4 animate-spin text-emerald-200" />{request.currentHelper ? `Asking ${request.currentHelper.name}... ${request.attempts} of ${request.candidateCount}` : "Finding helpers..."}</p>
                  <ol className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500">{["Understanding your problem", "Finding helpers", ...(request.currentHelper ? [`Asking ${request.currentHelper.name}`] : [])].map((step) => <li key={step} className="animate-pulse rounded-full border border-white/8 px-2.5 py-1">{step}</li>)}</ol>
                  <Button variant="ghost" size="sm" className="mt-3" onClick={() => void cancelRequest()}>Cancel request</Button>
                </div>
              ) : null}
              {request.status === "no_match" ? <div className="rounded-xl border border-amber-200/20 bg-amber-200/[0.04] p-4"><p className="text-sm text-amber-100">No helper accepted yet. Your quick answer is still here.</p><Button className="mt-3" size="sm" loading={responding} onClick={() => void postAsAsk()}>Post as an Ask</Button></div> : null}
              {request.status === "completed" ? <section className="rounded-xl border border-emerald-200/20 p-4"><h3 className="text-sm font-semibold text-emerald-100">Session recap</h3><p className="mt-2 text-sm text-slate-300">{request.recap}</p><ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-slate-300">{request.practiceSteps.map((step) => <li key={step}>{step}</li>)}</ol></section> : null}
              {request.status === "cancelled" ? <p className="text-sm text-slate-400">This request was cancelled.</p> : null}
              {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
              <p className="flex items-center gap-1 text-[10px] text-slate-500"><Clock3 className="size-3" />Helper offers expire after 90 seconds.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(incomingOffer)} onOpenChange={(value) => { if (!value) void respondToOffer("decline"); }}>
        <DialogContent className="border-emerald-200/20 bg-[#07110c]/95 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Help Now request</DialogTitle>
            <DialogDescription className="text-slate-400">A learner is looking for a quick skill session.</DialogDescription>
          </DialogHeader>
          {incomingOffer ? (
            <div>
              <p className="text-sm text-white">{incomingOffer.requester.name} needs help with {incomingOffer.skill}.</p>
              <p className="mt-2 text-sm text-slate-300">{incomingOffer.helperBrief}</p>
              <p className="mt-3 text-xs text-amber-200">{countdown}s to accept or decline · {incomingOffer.durationMinutes} minutes</p>
              {error ? <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p> : null}
              <div className="mt-4 flex gap-2"><Button loading={responding} onClick={() => void respondToOffer("accept")}>Accept & start</Button><Button variant="outline" disabled={responding} onClick={() => void respondToOffer("decline")}>Decline</Button></div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AvailabilityToggle() {
  const [available, setAvailable] = useState(false);
  const [availableFor, setAvailableFor] = useState<string[]>([]);
  const [durationMinutes, setDurationMinutes] = useState<30 | 60 | 120>(60);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/availability", { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { available?: boolean; availableFor?: string[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Availability could not be loaded.");
      if (active) {
        setAvailable(Boolean(data.available));
        setAvailableFor(data.availableFor ?? []);
      }
    }).catch(() => {
      if (active) setError("Availability could not be loaded.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !available, durationMinutes, availableFor }),
      });
      const data = await response.json() as { available?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to update availability.");
      setAvailable(Boolean(data.available));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update availability.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex items-center gap-1">
      <select aria-label="Availability duration" value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value) as 30 | 60 | 120)} className="hidden h-8 rounded-md border border-white/10 bg-black/30 px-1.5 text-[10px] text-slate-400 md:block"><option value={30}>30m</option><option value={60}>60m</option><option value={120}>120m</option></select>
      <button type="button" aria-pressed={available} disabled={busy || loading} onClick={() => void toggle()} className={`h-8 rounded-md border px-2 text-[10px] font-medium transition ${available ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-white/10 text-slate-400 hover:text-white"}`}>{available ? "Available" : "Available now"}</button>
      {error ? <span role="alert" className="sr-only">{error}</span> : null}
    </div>
  );
}
