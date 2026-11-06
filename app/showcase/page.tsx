import type { Metadata } from "next";

import { ShowcasePage } from "@/components/showcase-page";

export const metadata: Metadata = {
  title: "Project Showcase",
  description: "A shareable snapshot of the collaborators, skills, and quest behind a Skillin build.",
};

export default function ShowcaseRoute() {
  return <ShowcasePage />;
}
