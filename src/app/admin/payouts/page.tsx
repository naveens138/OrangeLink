import { getCreatorBalances, getPayoutHistory } from "@/lib/queries/payouts";
import { PayoutManager } from "@/components/admin/payout-manager";

export default async function AdminPayoutsPage() {
  const [balances, history] = await Promise.all([getCreatorBalances(), getPayoutHistory()]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2">Payouts</h1>
        <p className="mt-1 text-body text-text-secondary">
          What each creator is owed, and a record of what&apos;s actually been sent. Sending the
          money itself (bank transfer, etc.) happens outside this app. Razorpay Route isn&apos;t
          viable for automatic split payouts. See PROGRESS.md.
        </p>
      </div>

      <PayoutManager initialBalances={balances} initialHistory={history} />
    </div>
  );
}
