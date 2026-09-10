import { IdCard } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export default function MediaKitPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Media Kit</h1>
        <p className="mt-1 text-body text-text-secondary">
          Auto-generated stats for brand deals.
        </p>
      </div>
      <ComingSoon
        icon={IdCard}
        title="Auto-generated media kit"
        description="Connect Instagram/YouTube/TikTok to pull follower and engagement stats on a schedule, and publish a shareable media kit page with trends over time."
        milestone="Milestone 8: Media Kit"
      />
    </div>
  );
}
