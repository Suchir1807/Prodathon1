import type { AcceptedQuest, Conversation } from "@/lib/types";

/** Previously shipped demo threads. Drop them if they are still in local storage. */
export const PLACEHOLDER_CHAT_IDS = new Set([
  "dm-maya-chen",
  "dm-jordan-hale",
  "quest-campus-skill-swap",
]);

export function questChatId(questId: string) {
  return `quest-${questId}`;
}

export function buildQuestChat(quest: AcceptedQuest): Conversation {
  return {
    id: questChatId(quest.id),
    kind: "quest",
    title: quest.quest.title,
    subtitle: `${quest.partnerName} · ${quest.quest.timeline}`,
    avatarName: quest.partnerName,
    unread: 0,
    messages: [],
  };
}

export function messageFromYou(body: string, senderName: string) {
  return {
    id: crypto.randomUUID(),
    senderId: "you",
    senderName,
    body,
    timeLabel: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
  };
}

export function lastMessage(chat: Conversation) {
  return chat.messages[chat.messages.length - 1];
}

export function unreadTotal(chats: Conversation[]) {
  return chats.reduce((sum, chat) => sum + chat.unread, 0);
}
