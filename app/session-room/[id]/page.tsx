import { SessionRoomView } from "@/components/exchange-pages";

export default async function SessionRoomRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SessionRoomView roomId={id} />;
}
