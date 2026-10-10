import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Partners",
};

export default function FindPartnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
