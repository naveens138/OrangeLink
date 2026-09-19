import { redirect } from "next/navigation";

// Social scheduling was dropped: posting natively needs Meta app review
// (the same block that stopped Automations) and X's API costs more than
// it's worth at this stage. Creators are pointed at Buffer or Later
// instead of being promised a native feature. Old links land on the
// dashboard.
export default function SchedulePage() {
  redirect("/dashboard");
}
