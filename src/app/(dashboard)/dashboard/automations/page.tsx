import { Zap } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export default function AutomationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Automations</h1>
        <p className="mt-1 text-body text-text-secondary">
          Comment-to-DM rules for Instagram and Facebook.
        </p>
      </div>
      <ComingSoon
        icon={Zap}
        title="Comment-to-DM automation"
        description="Keyword-triggered rules that DM a link on Instagram/Facebook via the Meta Graph API. TikTok/YouTube fall back to public replies, kept explicit, never unified."
        milestone="Milestone 7: Comment-to-DM Automation"
      />
    </div>
  );
}
