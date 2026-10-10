import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quest Workspace",
};

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
