import type { Metadata } from "next";

import { TradingFloor } from "@/components/trading-floor";

export const metadata: Metadata = { title: "Trading Floor" };

export default function TradingFloorPage() {
  return <TradingFloor />;
}