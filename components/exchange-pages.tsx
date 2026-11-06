"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, BookOpen, CalendarClock, Handshake, Plus, RefreshCw, Star } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";

type Member = {
  id: string;
  username: string;
  displayName: string;
  skillsHave: string[];
  skillsLearn?: string[];
};

type UpcomingSession = {
  id: string;
  topic: string;
  startsAt: string;
  durationMinutes: number;
  roomId: string;
};

type Exchange = {
  id: string;
  status: "active" | "paused" | "ended";
  cadence: string;
  weeklyGoal: string;
  createdAt: string;
  members: Member[];
  upcomingSessions: UpcomingSession[];
};

type Appointment = {
  id: string;
  exchangeId: string;
  topic: string;
  startsAt: string;
  durationMinutes: number;
  status: "scheduled" | "completed" | "cancelled";
  teacherId: string;
  learnerId: string;
  roomId: string;
  partner: { id: string; username: string; displayName: string } | null;
  reviews: { reviewerId: string; rating: number; feedback: string }[];
};

type Ask = {
  id: string;
  author: { id: string; username: string; displayName: string };
  skillOffered: string;
  skillWanted: string;
  note: string;
  createdAt: string;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const data = (await response.json()) as T & { error?: string; redirectTo?: string };
  if (!response.ok) {
    if (response.status === 409 && data.redirectTo) window.location.assign(data.redirectTo);
    throw new Error(data.error ?? "Something went wrong. Please try again.");
  }
  return data;
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="mb-6">
      <p className="text-[10px] font-semibold tracking-[0.18em] text-emerald-300/75 uppercase">{eyebrow}</p>
      <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-white">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
    </header>
  );
}

export function ExchangesPage() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [goalDrafts, setGoalDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestJson<{ exchanges: Exchange[] }>("/api/exchanges");
      setExchanges(data.exchanges);
      setGoalDrafts(Object.fromEntries(data.exchanges.map((item) => [item.id, item.weeklyGoal])));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load Exchanges.");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function saveGoal(exchange: Exchange) {
    setSavingId(exchange.id);
    try {
      await requestJson(`/api/exchanges/${exchange.id}`, {
        method: "PATCH",
        body: JSON.stringify({ weeklyGoal: goalDrafts[exchange.id] ?? "" }),
      });
      setError("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save the shared goal.");
    } finally {
      setSavingId("");
    }
  }

  async function updateStatus(exchange: Exchange, status: "active" | "paused" | "ended") {
    setSavingId(exchange.id);
    try {
      await requestJson(`/api/exchanges/${exchange.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update this Exchange.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <PageHeading eyebrow="Keep learning together" title="Your Exchanges" description="Ongoing peer partnerships with a shared weekly goal and a rhythm that works for both of you." />
      {error ? <p role="alert" className="mb-4 rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">{error}</p> : null}
      {loading ? <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">Loading your Exchanges…</p> : exchanges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
          <Handshake className="mx-auto size-8 text-emerald-300" />
          <h2 className="mt-3 font-heading text-lg font-semibold text-white">Your next Exchange starts with a conversation.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">Find a peer whose skills complement yours, or respond to an Ask to start learning and teaching together.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button asChild size="sm"><Link href="/find-partners">Find a partner</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/asks">Explore Asks</Link></Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {exchanges.map((exchange) => (
            <article key={exchange.id} className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 backdrop-blur-xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-emerald-200/65 uppercase">{exchange.status} exchange · {exchange.cadence}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {exchange.members.map((member) => <span key={member.id} className="inline-flex items-center gap-2 text-sm text-white"><UserAvatar name={member.displayName} className="size-8 text-[10px]" />{member.displayName}</span>)}
                  </div>
                </div>
                <div className="flex gap-2">
                  {exchange.status !== "ended" ? (
                    <Button size="sm" variant="outline" disabled={savingId === exchange.id} onClick={() => void updateStatus(exchange, exchange.status === "paused" ? "active" : "paused")}>
                      {exchange.status === "paused" ? "Resume" : "Pause"}
                    </Button>
                  ) : null}
                  {exchange.status !== "ended" ? <Button size="sm" variant="ghost" disabled={savingId === exchange.id} onClick={() => void updateStatus(exchange, "ended")}>End Exchange</Button> : null}
                </div>
              </div>
              <label className="mt-5 block text-xs font-medium text-slate-400" htmlFor={`goal-${exchange.id}`}>Shared weekly goal</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input id={`goal-${exchange.id}`} value={goalDrafts[exchange.id] ?? ""} onChange={(event) => setGoalDrafts((value) => ({ ...value, [exchange.id]: event.target.value }))} maxLength={1000} placeholder="What are you both working toward learning?" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60" />
                <Button size="sm" variant="outline" loading={savingId === exchange.id} onClick={() => void saveGoal(exchange)}>Save goal</Button>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
                <p className="text-xs text-slate-400">{exchange.upcomingSessions.length ? `${exchange.upcomingSessions.length} upcoming Session${exchange.upcomingSessions.length === 1 ? "" : "s"}` : "No Session booked yet"}</p>
                <Button asChild size="sm"><Link href="/sessions">Book a Session <ArrowRight /></Link></Button>
              </div>
            </article>
          ))}
        </div>
      )}
      <button type="button" onClick={() => void load()} className="mt-5 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"><RefreshCw className="size-3.5" />Refresh</button>
    </div>
  );
}

export function AsksPage() {
  const [asks, setAsks] = useState<Ask[]>([]);
  const [skillOffered, setSkillOffered] = useState("");
  const [skillWanted, setSkillWanted] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestJson<{ asks: Ask[] }>("/api/asks");
      setAsks(data.asks);
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load Asks."); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await requestJson("/api/asks", { method: "POST", body: JSON.stringify({ skillOffered, skillWanted, note }) });
      setSkillOffered(""); setSkillWanted(""); setNote("");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to publish your Ask."); }
    finally { setBusy(false); }
  }

  async function accept(ask: Ask) {
    setBusy(true);
    try {
      const result = await requestJson<{ exchangeId: string }>(`/api/asks/${ask.id}/accept`, { method: "POST", body: "{}" });
      router.push(`/exchanges`);
      return result;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to respond to this Ask."); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <PageHeading eyebrow="Ask your community" title="Skill Asks" description="Share a specific skill you can offer and the one you want to learn. When someone accepts, you can start an Exchange together." />
      {error ? <p role="alert" className="mb-4 rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">{error}</p> : null}
      <form onSubmit={(event) => void publish(event)} className="mb-7 grid gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.035] p-4 sm:grid-cols-2 sm:p-5">
        <label className="text-xs text-slate-400">I can teach<input required maxLength={80} value={skillOffered} onChange={(event) => setSkillOffered(event.target.value)} placeholder="e.g. Figma prototyping" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60" /></label>
        <label className="text-xs text-slate-400">I want to learn<input required maxLength={80} value={skillWanted} onChange={(event) => setSkillWanted(event.target.value)} placeholder="e.g. user research" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60" /></label>
        <label className="text-xs text-slate-400 sm:col-span-2">A little context<textarea required minLength={10} maxLength={1000} rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What would make this exchange useful for you?" className="mt-1.5 w-full resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60" /></label>
        <div className="sm:col-span-2"><Button type="submit" size="sm" loading={busy}><Plus />Publish an Ask</Button></div>
      </form>
      <h2 className="mb-3 font-heading text-lg font-semibold text-white">Open Asks</h2>
      {loading ? <p className="text-sm text-slate-400">Loading open Asks…</p> : asks.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-400">No open Asks yet. Add yours above and invite the community to learn with you.</p> : (
        <div className="grid gap-3 md:grid-cols-2">
          {asks.map((ask) => <article key={ask.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-center gap-2"><UserAvatar name={ask.author.displayName} className="size-8 text-[10px]" /><p className="text-sm font-medium text-white">{ask.author.displayName}</p></div>
            <p className="mt-4 text-sm text-slate-300"><span className="text-emerald-200">Offers</span> {ask.skillOffered} <span className="mx-1 text-slate-600">·</span> <span className="text-lime-200">Wants</span> {ask.skillWanted}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{ask.note}</p>
            <Button className="mt-4" size="sm" variant="outline" disabled={busy} onClick={() => void accept(ask)}>Respond to Ask <ArrowRight /></Button>
          </article>)}
        </div>
      )}
    </div>
  );
}

export function SessionsPage() {
  const { data: authSession } = useSession();
  const [sessions, setSessions] = useState<Appointment[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [bookingExchange, setBookingExchange] = useState("");
  const [topic, setTopic] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [teacherId, setTeacherId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionData, exchangeData, creditData] = await Promise.all([
        requestJson<{ sessions: Appointment[]; balance: number }>("/api/sessions"),
        requestJson<{ exchanges: Exchange[] }>("/api/exchanges"),
        requestJson<{ balance: number }>("/api/credits"),
      ]);
      setSessions(sessionData.sessions); setBalance(creditData.balance); setExchanges(exchangeData.exchanges);
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load Sessions."); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const selectedExchange = useMemo(() => exchanges.find((exchange) => exchange.id === bookingExchange), [exchanges, bookingExchange]);
  const teacherOptions = selectedExchange?.members.filter((member) => member.id !== authSession?.user?.id) ?? [];

  async function book(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedExchange || !teacherId || !startsAt) return;
    setBusyId("booking");
    try {
      await requestJson("/api/sessions", { method: "POST", body: JSON.stringify({
        exchangeId: selectedExchange.id,
        teacherId,
        topic,
        startsAt: new Date(startsAt).toISOString(),
        durationMinutes,
        idempotencyKey: crypto.randomUUID(),
      }) });
      setTopic(""); setStartsAt(""); setBookingExchange(""); setTeacherId("");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to book this Session."); }
    finally { setBusyId(""); }
  }

  async function updateStatus(appointment: Appointment, status: "completed" | "cancelled") {
    setBusyId(appointment.id);
    try {
      await requestJson(`/api/sessions/${appointment.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update this Session."); }
    finally { setBusyId(""); }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <PageHeading eyebrow="Make time to learn" title="Sessions" description={`Book focused time with an Exchange partner. Your current balance is ${balance} minutes.`} />
      {error ? <p role="alert" className="mb-4 rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">{error}</p> : null}
      <form onSubmit={(event) => void book(event)} className="mb-7 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/45 p-4 sm:grid-cols-2 sm:p-5">
        <h2 className="font-heading text-lg font-semibold text-white sm:col-span-2">Book a Session</h2>
        <label className="text-xs text-slate-400 sm:col-span-2">Exchange<select required value={bookingExchange} onChange={(event) => { setBookingExchange(event.target.value); setTeacherId(""); }} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#07110c] px-3 py-2 text-sm text-white"><option value="">Choose an active Exchange</option>{exchanges.filter((exchange) => exchange.status === "active").map((exchange) => <option key={exchange.id} value={exchange.id}>{exchange.members.map((member) => member.displayName).join(" + ")}</option>)}</select></label>
        <label className="text-xs text-slate-400">What would you like to learn?<input required minLength={3} maxLength={200} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Session topic" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
        <label className="text-xs text-slate-400">Your teacher<select required value={teacherId} onChange={(event) => setTeacherId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#07110c] px-3 py-2 text-sm text-white"><option value="">Choose your partner</option>{teacherOptions.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select></label>
        <label className="text-xs text-slate-400">Start time<input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
        <label className="text-xs text-slate-400">Duration<select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#07110c] px-3 py-2 text-sm text-white">{[15, 30, 45, 60, 90, 120, 180].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label>
        <div className="sm:col-span-2"><Button type="submit" size="sm" loading={busyId === "booking"} disabled={!exchanges.some((exchange) => exchange.status === "active")}>Book Session</Button><span className="ml-3 text-xs text-slate-500">The learner reserves one time credit per minute.</span></div>
      </form>
      <div className="mb-3 flex items-center justify-between"><h2 className="font-heading text-lg font-semibold text-white">Your Sessions</h2><Button variant="ghost" size="sm" onClick={() => void load()}><RefreshCw />Refresh</Button></div>
      {loading ? <p className="text-sm text-slate-400">Loading Sessions…</p> : sessions.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-400">No Sessions yet. Start an Exchange and book your first learning session.</p> : (
        <div className="grid gap-3">
          {sessions.map((appointment) => <article key={appointment.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-lg border border-emerald-300/15 bg-emerald-300/[0.05] text-emerald-200"><CalendarClock className="size-4" /></span><div><h3 className="font-medium text-white">{appointment.topic}</h3><p className="mt-1 text-xs text-slate-400">{appointment.partner?.displayName ?? "Exchange partner"} · {new Date(appointment.startsAt).toLocaleString()} · {appointment.durationMinutes} min</p></div></div>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-slate-300">{appointment.status}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline"><Link href={`/session-room/${appointment.roomId}`}><BookOpen />Open SessionRoom</Link></Button>
              {appointment.status === "scheduled" ? <><Button size="sm" variant="ghost" disabled={busyId === appointment.id} onClick={() => void updateStatus(appointment, "completed")}>Mark complete</Button><Button size="sm" variant="ghost" disabled={busyId === appointment.id} onClick={() => void updateStatus(appointment, "cancelled")}>Cancel</Button></> : null}
              {appointment.status === "completed" && !appointment.reviews.some((review) => review.reviewerId === authSession?.user?.id) ? <ReviewForm sessionId={appointment.id} onSubmitted={() => void load()} /> : null}
            </div>
          </article>)}
        </div>
      )}
    </div>
  );
}

function ReviewForm({ sessionId, onSubmitted }: { sessionId: string; onSubmitted: () => void }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [skills, setSkills] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Star />Review partner</Button>;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    try {
      await requestJson(`/api/sessions/${sessionId}/review`, { method: "POST", body: JSON.stringify({ rating, feedback, skills: skills.split(",").map((skill) => skill.trim()).filter(Boolean) }) });
      onSubmitted();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save review."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={(event) => void submit(event)} className="mt-3 w-full rounded-lg border border-white/10 p-3">
    {error ? <p role="alert" className="mb-2 text-xs text-rose-300">{error}</p> : null}
    <div className="flex flex-wrap gap-2"><label className="text-xs text-slate-400">Rating<select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="ml-2 rounded border border-white/10 bg-black/40 px-2 py-1 text-white">{[5, 4, 3, 2, 1].map((score) => <option key={score} value={score}>{score} / 5</option>)}</select></label><input value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="Skills verified (comma-separated)" className="min-w-48 flex-1 rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-white" /></div>
    <textarea required minLength={10} maxLength={2000} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Share helpful feedback" className="mt-2 w-full rounded border border-white/10 bg-black/30 px-2 py-2 text-sm text-white" />
    <Button size="sm" className="mt-2" loading={busy}>Submit review</Button>
  </form>;
}

type Room = {
  id: string; sessionId: string; topic: string; startsAt: string; durationMinutes: number;
  sessionStatus: string; notes: string; revision: number; updatedAt: string; lastEditedBy: string | null;
  members: Member[];
};

type RoomMessage = { id: string; senderId: string; receiverId: string; content: string; timestamp: string };

export function SessionRoomView({ roomId }: { roomId: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [notes, setNotes] = useState("");
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [message, setMessage] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const loadRoom = useCallback(async () => {
    try {
      const data = await requestJson<{ room: Room }>(`/api/session-rooms/${roomId}`);
      setRoom(data.room); setNotes(data.room.notes); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load SessionRoom."); }
  }, [roomId]);

  const loadMessages = useCallback(async () => {
    try {
      const data = await requestJson<{ partner: { id: string }; messages: RoomMessage[] }>(`/api/messages?sessionRoomId=${encodeURIComponent(roomId)}`);
      setPartnerId(data.partner.id); setMessages(data.messages);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load Session messages."); }
  }, [roomId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRoom(); void loadMessages();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void loadMessages(); }, 4000);
    return () => window.clearInterval(timer);
  }, [loadRoom, loadMessages]);

  async function saveNotes() {
    if (!room) return;
    setSaving(true);
    try {
      const data = await requestJson<{ notes: string; revision: number; updatedAt: string; lastEditedBy: string | null }>(`/api/session-rooms/${room.id}`, { method: "PUT", body: JSON.stringify({ notes, expectedRevision: room.revision }) });
      setRoom({ ...room, ...data }); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save notes."); }
    finally { setSaving(false); }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim() || !partnerId) return;
    const body = message.trim(); setMessage("");
    try {
      const sent = await requestJson<RoomMessage>("/api/messages", { method: "POST", body: JSON.stringify({ receiverId: partnerId, sessionRoomId: roomId, content: body, idempotencyKey: crypto.randomUUID() }) });
      setMessages((current) => [...current, sent]);
    } catch (reason) {
      setMessage(body);
      setError(reason instanceof Error ? reason.message : "Unable to send message.");
    }
  }

  const partnerName = room?.members.find((member) => member.id === partnerId)?.displayName ?? "Your partner";

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-3.5rem)] max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] md:px-6">
      <section className="flex min-h-[500px] flex-col rounded-2xl border border-white/10 bg-slate-950/45 p-5">
        {error ? <p role="alert" className="mb-3 rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">{error}<button onClick={() => { void loadRoom(); void loadMessages(); }} className="ml-2 underline">Retry</button></p> : null}
        <button type="button" onClick={() => router.push("/sessions")} className="mb-4 w-fit text-xs text-emerald-200 hover:text-white">← Back to Sessions</button>
        {room ? <>
          <p className="text-[10px] font-semibold tracking-[0.15em] text-emerald-200/70 uppercase">SessionRoom · {room.sessionStatus}</p>
          <h1 className="mt-2 font-heading text-2xl font-semibold text-white">{room.topic}</h1>
          <p className="mt-2 text-sm text-slate-400">{new Date(room.startsAt).toLocaleString()} · {room.durationMinutes} minutes · {room.members.map((member) => member.displayName).join(" + ")}</p>
          <div className="mt-6 flex flex-1 flex-col">
            <div className="mb-2 flex items-center justify-between"><label htmlFor="room-notes" className="text-sm font-medium text-white">Shared session notes</label><span className="text-[11px] text-slate-500">{room.lastEditedBy ? "Saved to this room" : "Not saved yet"}</span></div>
            <textarea id="room-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={20000} placeholder="Capture key ideas, examples, and next steps…" className="min-h-64 flex-1 resize-y rounded-xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60" />
            <div className="mt-3 flex justify-end"><Button size="sm" loading={saving} onClick={() => void saveNotes()}>Save notes</Button></div>
          </div>
        </> : <p className="text-sm text-slate-400">Loading SessionRoom…</p>}
      </section>
      <section className="flex min-h-[500px] flex-col rounded-2xl border border-white/10 bg-slate-950/45">
        <header className="border-b border-white/8 p-4"><p className="text-sm font-semibold text-white">Session chat</p><p className="mt-1 text-xs text-slate-500">A private chat with {partnerName}</p></header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {messages.length === 0 ? <p className="py-8 text-center text-xs text-slate-500">Say hello and align on what you want to learn.</p> : messages.map((item) => <article key={item.id} className="rounded-lg border border-white/8 bg-white/[0.025] p-3"><p className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{item.content}</p></article>)}
        </div>
        <form onSubmit={(event) => void sendMessage(event)} className="flex gap-2 border-t border-white/8 p-3">
          <label htmlFor="room-chat-message" className="sr-only">Write a message to {partnerName}</label>
          <input id="room-chat-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} placeholder="Write a message…" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60" />
          <Button size="sm" type="submit" disabled={!message.trim() || !partnerId}>Send</Button>
        </form>
      </section>
    </div>
  );
}
