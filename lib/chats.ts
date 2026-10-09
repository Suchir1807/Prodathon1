import type { AcceptedQuest, Conversation } from "@/lib/types";

export const SEED_CHATS: Conversation[] = [
  {
    id: "dm-maya-chen",
    kind: "dm",
    title: "Maya Chen",
    subtitle: "Backend engineer",
    avatarName: "Maya Chen",
    unread: 2,
    messages: [
      {
        id: "maya-1",
        senderId: "you",
        senderName: "You",
        body: "If I take the dashboard, can you own the API contract tonight?",
        timeLabel: "9:12 AM",
      },
      {
        id: "maya-2",
        senderId: "maya-chen",
        senderName: "Maya Chen",
        body: "Yes. Seed endpoint is up with three sample wallets.",
        timeLabel: "9:18 AM",
      },
      {
        id: "maya-3",
        senderId: "maya-chen",
        senderName: "Maya Chen",
        body: "Pushed the route. Wire the balance cards when you are free.",
        timeLabel: "9:21 AM",
      },
    ],
  },
  {
    id: "dm-jordan-hale",
    kind: "dm",
    title: "Jordan Hale",
    subtitle: "ML builder",
    avatarName: "Jordan Hale",
    unread: 0,
    messages: [
      {
        id: "jordan-1",
        senderId: "jordan-hale",
        senderName: "Jordan Hale",
        body: "The agent prompt is in the doc. It still hallucinates the deadline.",
        timeLabel: "Yesterday",
      },
      {
        id: "jordan-2",
        senderId: "you",
        senderName: "You",
        body: "I'll cap the output to the quest schema and send a screenshot.",
        timeLabel: "Yesterday",
      },
    ],
  },
  {
    id: "quest-campus-skill-swap",
    kind: "quest",
    title: "Campus Skill Swap",
    subtitle: "Maya Chen, Jordan Hale · 3 Days",
    avatarName: "Campus Skill Swap",
    unread: 1,
    messages: [
      {
        id: "swap-1",
        senderId: "maya-chen",
        senderName: "Maya Chen",
        body: "Day 2 API is up. The board can read open skill requests.",
        timeLabel: "4:02 PM",
      },
      {
        id: "swap-2",
        senderId: "you",
        senderName: "You",
        body: "I'll hook the board tonight and leave the empty state ugly on purpose until it works.",
        timeLabel: "4:10 PM",
      },
      {
        id: "swap-3",
        senderId: "jordan-hale",
        senderName: "Jordan Hale",
        body: "Nice. I'll add the match score once those cards render.",
        timeLabel: "4:14 PM",
      },
    ],
  },
];

export function questChatId(questId: string) {
  return `quest-${questId}`;
}

export function buildQuestChat(quest: AcceptedQuest, senderName: string): Conversation {
  const timeLabel = new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    id: questChatId(quest.id),
    kind: "quest",
    title: quest.quest.title,
    subtitle: `${quest.partnerName} · ${quest.quest.timeline}`,
    avatarName: quest.partnerName,
    unread: 0,
    messages: [
      {
        id: `${quest.id}-open`,
        senderId: quest.partnerId,
        senderName: quest.partnerName,
        body: `Quest locked with ${senderName}. I'll take the ${quest.quest.studentB.focus.toLowerCase()} track. Drop the Day 1 plan here.`,
        timeLabel,
      },
    ],
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
