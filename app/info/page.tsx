import type { Metadata } from "next";

import { InfoGuide } from "@/components/info-guide";

export const metadata: Metadata = {
  title: "How it Works",
  description: "A guide to teaching what you know, earning time credits, and learning from peers on Skillin.",
};

export default function InfoPage() {
  return <InfoGuide />;
}
