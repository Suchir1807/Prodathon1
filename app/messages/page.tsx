import type { Metadata } from "next";

import { MessagesHub } from "@/components/messages-hub";

export const metadata: Metadata = {
  title: "Messages",
};

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ chat?: string | string[] }>;
}) {
  const params = await searchParams;
  const value = params.chat;
  const chat = typeof value === "string" ? value : undefined;
  return <MessagesHub initialChatId={chat} />;
}
