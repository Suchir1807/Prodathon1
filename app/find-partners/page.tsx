import type { Metadata } from "next";

import { PartnerBoard } from "@/components/partner-board";

export const metadata: Metadata = {
  title: "Find Partners",
};

export default function FindPartnersPage() {
  return <PartnerBoard />;
}
