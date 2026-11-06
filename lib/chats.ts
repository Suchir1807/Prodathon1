import type { Conversation } from "@/lib/types";

export const PLACEHOLDER_CHAT_IDS = new Set([
  "dm-maya-chen",
  "dm-jordan-hale",
]);

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
