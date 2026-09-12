import { redirect } from "next/navigation";

// Media Kit was replaced by Schedule in the dashboard menu; old links and
// bookmarks land there instead of on a dead page.
export default function MediaKitPage() {
  redirect("/dashboard/schedule");
}
