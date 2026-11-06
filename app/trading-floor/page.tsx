import { redirect } from "next/navigation";

export default function LegacyTradingFloorRedirect() {
  redirect("/asks");
}
