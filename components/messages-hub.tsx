"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, Send, Users } from "lucide-react";

import { useProfile } from "@/components/profile-provider";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lastMessage } from "@/lib/chats";
import type { ChatKind, Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: { id: ChatKind; label: string }[] = [
  { id: "dm", label: "Direct Messages" },
  { id: "quest", label: "Quest Groups" },
];

export function MessagesHub({ initialChatId }: { initialChatId?: string }) {
  const router = useRouter();
  const { chats, sendMessage, markRead } = useProfile();
  const [tab, setTab] = useState<ChatKind>(
    initialChatId?.startsWith("quest-") ? "quest" : "dm",
  );
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [activeId, setActiveId] = useState<string | null>(initialChatId ?? null);
  const [trackedId, setTrackedId] = useState(initialChatId);
  const scroller = useRef<HTMLDivElement>(null);

  if (initialChatId && initialChatId !== trackedId) {
    setTrackedId(initialChatId);
    setActiveId(initialChatId);
    if (initialChatId.startsWith("quest-")) setTab("quest");
    if (initialChatId.startsWith("dm-")) setTab("dm");
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return chats.filter((chat) => {
      if (chat.kind !== tab) return false;
      if (!needle) return true;
      const recent = lastMessage(chat)?.body.toLowerCase() ?? "";
      return chat.title.toLowerCase().includes(needle) || recent.includes(needle);
    });
  }, [chats, query, tab]);

  const active = chats.find((chat) => chat.id === activeId) ?? null;

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [active?.id, active?.messages.length]);

  function openChat(chat: Conversation) {
    setActiveId(chat.id);
    setTrackedId(chat.id);
    setTab(chat.kind);
    markRead(chat.id);
    router.replace(`/messages?chat=${chat.id}`, { scroll: false });
  }

  function send() {
    if (!active) return;
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    sendMessage(active.id, text);
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
            placeholder="Search conversations"
            aria-label="Search conversations"
          />
          <div className="mt-3 grid grid-cols-2 gap-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "rounded-md border-l-2 px-2 py-1.5 text-xs font-medium transition",
                  tab === item.id
                    ? "border-[#ccff00] bg-slate-800/80 text-[#ccff00]"
                    : "border-transparent text-slate-400 hover:text-white",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-400">No conversations match that search.</p>
          ) : (
            <ul>
              {visible.map((chat) => {
                const recent = lastMessage(chat);
                const selected = chat.id === active?.id;
                return (
                  <li key={chat.id}>
                    <button
                      type="button"
                      onClick={() => openChat(chat)}
                      className={cn(
                        "flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left transition hover:bg-white/5",
                        selected ? "border-[#ccff00] bg-slate-800/80" : "border-transparent",
                      )}
                    >
                      <ChatAvatar chat={chat} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-white">{chat.title}</span>
                          <span className="shrink-0 text-[10px] text-slate-500">{recent?.timeLabel}</span>
                        </span>
                        <span className="mt-0.5 line-clamp-1 block text-xs text-slate-400">
                          {recent?.body}
                        </span>
                      </span>
                      {chat.unread > 0 ? (
                        <span className="mt-1 text-[11px] font-medium text-[#ccff00]">{chat.unread}</span>
                      ) : null}
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
              <ChatAvatar chat={active} />
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{active.title}</h2>
                <p className="truncate text-xs text-slate-400">{active.subtitle}</p>
              </div>
            </header>
            <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {active.messages.map((message) => {
                const mine = message.senderId === "you";
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
                      {active.kind === "quest" && !mine ? (
                        <p className="mb-1 text-[11px] font-medium text-[#ccff00]">{message.senderName}</p>
                      ) : null}
                      <p>{message.body}</p>
                      <p className={cn("mt-1 text-[10px]", mine ? "text-[#ccff00]/70" : "text-slate-500")}>
                        {message.timeLabel}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form
              className="px-4 pb-4"
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
            >
              <div className="glass flex items-center gap-2 rounded-full px-2 py-1">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={active.kind === "quest" ? "Message the quest group" : `Message ${active.title}`}
                  aria-label="Message"
                  className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
                <Button type="submit" size="icon-sm" className="rounded-full" aria-label="Send" disabled={!draft.trim()}>
                  <Send />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <MessageSquare className="size-12 text-slate-600" />
            <p className="max-w-xs text-sm text-slate-400">
              Select a conversation or start a new Quest to begin collaborating
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function ChatAvatar({ chat }: { chat: Conversation }) {
  if (chat.kind === "quest") {
    return (
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-[#ccff00]/70 bg-[#ccff00]/10 text-[#ccff00]">
        <Users className="size-4" />
      </span>
    );
  }
  return <UserAvatar name={chat.avatarName} />;
}
