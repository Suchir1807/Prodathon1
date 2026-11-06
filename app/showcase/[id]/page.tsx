import type { Metadata } from "next";

import { PublicShowcase } from "@/components/public-showcase";

export const metadata: Metadata = {
  title: "Completed Quest | Skillin",
  description: "A verified student collaboration, from matched skills to a shipped build.",
};

export default async function PublicShowcasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PublicShowcase id={id} />;
}
