"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, MessageSquare, Send } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MutualContact = {
  id: string;
  username: string;
  displayName: string;
  skillsHave: string[];
};

type PersistedMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
};

export function MessagesHub({ initialChatId }: { initialChatId?: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (!initialChatId) return null;
    return initialChatId.startsWith("dm-") ? initialChatId.slice(3) : initialChatId;
  });
  const [contacts, setContacts] = useState<MutualContact[]>([]);
  const [messages, setMessages] = useState<PersistedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const sendRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      try {
        const response = await fetch("/api/messages", { cache: "no-store" });
        const data = (await response.json()) as {
          mutuals?: MutualContact[];
          messages?: PersistedMessage[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "Could not load messages.");
        if (!cancelled) {
          setContacts(data.mutuals ?? []);
          setMessages(data.messages ?? []);
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load messages.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadMessages();
    const interval = window.setInterval(() => void loadMessages(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const needle = query.trim().toLowerCase();
  const visible = contacts.filter((contact) => {
    const name = contact.displayName.toLowerCase();
    return !needle || name.includes(needle) || contact.username.toLowerCase().includes(needle);
  });
  const active = contacts.find((contact) => contact.id === activeId) ?? null;
  const activeMessages = messages.filter((message) =>
    active && (
      (message.senderId === currentUserId && message.receiverId === active.id) ||
      (message.senderId === active.id && message.receiverId === currentUserId)
    ),
  );

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [active?.id, activeMessages.length]);

  function openChat(contact: MutualContact) {
    setActiveId(contact.id);
    setError("");
    router.replace(`/messages?chat=${contact.id}`, { scroll: false });
  }

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active || sendRef.current) return;
    const text = draft.trim();
    if (!text) return;
    sendRef.current = true;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: active.id, content: text }),
      });
      const data = (await response.json()) as PersistedMessage & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not send message.");
      setMessages((current) => [...current, data]);
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send message.");
    } finally {
      setSending(false);
      sendRef.current = false;
    }
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] overflow-hidden">
      <aside
        className={cn(
          "w-full shrink-0 flex-col border-white/8 bg-[#0c1324]/70 backdrop-blur-xl md:flex md:w-80 md:border-r",
          active ? "hidden" : "flex",
        )}
      >
        <div className="border-b border-white/8 p-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a mutual"
            aria-label="Find a mutual friend"
          />
          <p className="mt-3 text-[11px] text-slate-500">Mutual connections</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="flex items-center gap-2 px-4 py-8 text-sm text-slate-400">
              <Loader2 className="size-4 animate-spin" /> Loading mutuals…
            </p>
          ) : visible.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-400">
              {contacts.length ? "No mutuals match that search." : "Follow each other to start a conversation."}
            </p>
          ) : (
            <ul>
              {visible.map((contact) => {
                const recent = [...messages].reverse().find((message) =>
                  (message.senderId === contact.id && message.receiverId === currentUserId) ||
                  (message.senderId === currentUserId && message.receiverId === contact.id),
                );
                const name = contact.displayName.trim() || contact.username;
                const selected = contact.id === active?.id;
                return (
                  <li key={contact.id}>
                    <button
                      type="button"
                      onClick={() => openChat(contact)}
                      className={cn(
                        "flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left transition hover:bg-white/5",
                        selected ? "border-[#ccff00] bg-slate-800/80" : "border-transparent",
                      )}
                    >
                      <UserAvatar name={name} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-white">{name}</span>
                          <span className="shrink-0 text-[10px] text-slate-500">
                            {recent ? new Date(recent.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}
                          </span>
                        </span>
                        <span className="mt-0.5 line-clamp-1 block text-xs text-slate-400">
                          {recent?.content ?? `@${contact.username}`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section className={cn("min-w-0 flex-1 flex-col", active ? "flex" : "hidden md:flex")}>
        {active ? (
          <>
            <header className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Back to conversations"
                onClick={() => {
                  setActiveId(null);
                  router.replace("/messages", { scroll: false });
                }}
              >
                <ArrowLeft />
              </Button>
              <UserAvatar name={active.displayName.trim() || active.username} />
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">
                  {active.displayName.trim() || active.username}
                </h2>
                <p className="truncate text-xs text-slate-400">@{active.username} · mutual</p>
              </div>
            </header>
            <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {activeMessages.map((message) => {
                const mine = message.senderId === currentUserId;
                return (
                  <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm sm:max-w-[70%]",
                        mine
                          ? "border border-[#ccff00]/40 bg-[#10182b]/80 text-white backdrop-blur"
                          : "bg-slate-900/80 text-slate-100",
                      )}
                    >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      <p className={cn("mt-1 text-[10px]", mine ? "text-[#ccff00]/70" : "text-slate-500")}>
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
                {activeMessages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">Start the conversation.</p>
                ) : null}
            </div>
              <form className="px-4 pb-4" onSubmit={(event) => void send(event)}>
              <div className="glass flex items-center gap-2 rounded-full px-2 py-1">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                    placeholder={`Message ${active.displayName.trim() || active.username}`}
                  aria-label="Message"
                  className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
                  <Button type="submit" size="icon-sm" className="rounded-full" aria-label="Send" disabled={!draft.trim() || sending}>
                  <Send />
                </Button>
              </div>
            </form>
              {error ? <p role="alert" className="px-5 pb-3 text-xs text-red-300">{error}</p> : null}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <MessageSquare className="size-12 text-slate-600" />
              <p className="max-w-xs text-sm text-slate-400">
                {error || "Choose a mutual friend to open a conversation."}
              </p>
          </div>
        )}
      </section>
    </div>
  );
}
