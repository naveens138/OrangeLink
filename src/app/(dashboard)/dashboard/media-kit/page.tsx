import { redirect } from "next/navigation";

// Media Kit (Milestone 8) was dropped before it was built: the stats it
// exists to show need IG/YouTube/TikTok OAuth and platform review we don't
// have, and a media kit the creator fills in by hand isn't worth shipping.
// Schedule, which replaced it in the menu, was dropped too. Old links and
// bookmarks land on the dashboard.
export default function MediaKitPage() {
  redirect("/dashboard");
}
