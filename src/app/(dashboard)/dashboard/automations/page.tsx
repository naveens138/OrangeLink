import { redirect } from "next/navigation";

// Automations (comment-to-DM) was dropped: it needs Meta API approval the
// platform doesn't have, and would only mirror what Instagram already
// offers creators for free. Old links land on the dashboard instead.
export default function AutomationsPage() {
  redirect("/dashboard");
}
