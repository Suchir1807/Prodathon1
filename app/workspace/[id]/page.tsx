import { redirect } from "next/navigation";

export default function LegacyWorkspaceIdRedirect() {
  redirect("/sessions");
}
