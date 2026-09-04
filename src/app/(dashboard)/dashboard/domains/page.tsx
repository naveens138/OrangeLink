import { Globe } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export default function DomainsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Domains</h1>
        <p className="mt-1 text-body text-text-secondary">
          Connect a custom domain to your page.
        </p>
      </div>
      <ComingSoon
        icon={Globe}
        title="Custom domain setup"
        description="CNAME verification and SSL provisioning via the Vercel domains API."
        milestone="Milestone 1 — Foundation"
      />
    </div>
  );
}
