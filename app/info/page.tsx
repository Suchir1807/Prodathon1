import type { Metadata } from "next";

import { InfoGuide } from "@/components/info-guide";

export const metadata: Metadata = {
  title: "How it Works",
  description: "A guide to finding collaborators and building together on Skillin.",
};

export default function InfoPage() {
  return <InfoGuide />;
}
