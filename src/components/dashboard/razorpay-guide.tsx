import { ArrowUpRight, ChevronDown } from "lucide-react";

const keySteps = [
  {
    title: "Sign in to Razorpay",
    body: (
      <>
        Open the{" "}
        <a
          href="https://dashboard.razorpay.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 font-medium text-text-primary underline underline-offset-2"
        >
          Razorpay Dashboard
          <ArrowUpRight className="h-3 w-3" />
        </a>
        . No account yet? Sign up there. Razorpay asks for business and bank
        details (KYC) before it lets you take real payments, and that review
        can take a few days.
      </>
    ),
  },
  {
    title: "Switch to Live mode",
    body: (
      <>
        Use the Test / Live switch at the top of the dashboard. Test mode keys
        start with <code>rzp_test_</code> and are only for trying things out;
        no real money moves.
      </>
    ),
  },
  {
    title: "Generate your API key",
    body: (
      <>
        Go to <b>Account &amp; Settings → API Keys</b> and click{" "}
        <b>Generate Key</b>.
      </>
    ),
  },
  {
    title: "Copy both values into the form above",
    body: (
      <>
        The <b>Key ID</b> starts with <code>rzp_live_</code>. The{" "}
        <b>Key Secret</b> is shown only once, so paste it here before closing
        Razorpay&apos;s window. Lost it? Regenerate the key in Razorpay and
        enter the new pair here.
      </>
    ),
  },
];

const webhookSteps = [
  {
    title: "Add a webhook in Razorpay",
    body: (
      <>
        In <b>Account &amp; Settings → Webhooks</b>, click{" "}
        <b>Add New Webhook</b> and paste your webhook URL from the box above.
      </>
    ),
  },
  {
    title: "Choose a secret and the event",
    body: (
      <>
        Type any long, random secret, tick the <code>payment.captured</code>{" "}
        event, and save.
      </>
    ),
  },
  {
    title: "Paste the same secret here",
    body: (
      <>
        Enter it in <b>Webhook secret</b> above and save. This makes sure a sale
        still completes if the buyer closes the tab mid-payment.
      </>
    ),
  },
];

function Steps({ steps, start }: { steps: typeof keySteps; start: number }) {
  return (
    <ol className="flex flex-col gap-4">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-3">
          <span className="mt-[3px] font-mono text-label text-[var(--accent-strong)]">
            {String(start + i).padStart(2, "0")}
          </span>
          <div>
            <p className="text-h3">{step.title}</p>
            <p className="mt-0.5 text-small leading-relaxed text-text-secondary [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-text-primary [&_b]:font-medium [&_b]:text-text-primary">
              {step.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Where to find the keys the form above asks for, step by step. Open until
 * the creator has connected, then folded away but still there for when
 * they rotate keys.
 */
export function RazorpayGuide({ connected }: { connected: boolean }) {
  return (
    <details
      open={!connected}
      className="group max-w-xl rounded-md border border-border bg-surface-1 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
        <span>
          <span className="block text-h3">How to get your Razorpay keys</span>
          <span className="mt-0.5 block text-small text-text-secondary">
            About 5 minutes once your Razorpay account is activated.
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div className="flex flex-col gap-6 border-t border-border p-4 pt-5">
        <div>
          <p className="mb-3 font-mono text-label uppercase tracking-[0.1em] text-text-muted">
            API keys
          </p>
          <Steps steps={keySteps} start={1} />
        </div>
        <div>
          <p className="mb-3 font-mono text-label uppercase tracking-[0.1em] text-text-muted">
            Webhook (recommended)
          </p>
          <Steps steps={webhookSteps} start={keySteps.length + 1} />
        </div>
      </div>
    </details>
  );
}
