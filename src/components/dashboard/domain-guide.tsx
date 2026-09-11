import { ChevronDown } from "lucide-react";

type Step = { title: string; body: React.ReactNode };

const steps: Step[] = [
  {
    title: "Get a domain",
    body: (
      <>
        Buy one from any domain company, like Namecheap, GoDaddy or Cloudflare. Already have
        one? Use it. You can use the main address (<code>yourname.com</code>) or a part of it
        (<code>shop.yourname.com</code>).
      </>
    ),
  },
  {
    title: "Connect it here",
    body: (
      <>
        Type the domain into the box on this page and click <b>Connect</b>. We&apos;ll show you
        the exact record to add, with copy buttons.
      </>
    ),
  },
  {
    title: "Add the record where you bought the domain",
    body: (
      <>
        Sign in to your domain company, open the domain&apos;s <b>DNS settings</b>, add a new
        record, and copy in the <b>Type</b>, <b>Name</b> and <b>Value</b> exactly as shown here.
        Where to find it:
        <span className="mt-2 block rounded-md border border-border bg-background p-2.5 text-[12px] leading-relaxed">
          <b>Namecheap:</b> Domain List → Manage → Advanced DNS → Add New Record
          <br />
          <b>GoDaddy:</b> My Products → your domain → DNS → Add New Record
          <br />
          <b>Cloudflare:</b> your domain → DNS → Records → Add record, and set Proxy status to{" "}
          <b>DNS only</b> (grey cloud)
          <br />
          <b>Anywhere else:</b> look for DNS, DNS management or Advanced DNS
        </span>
      </>
    ),
  },
  {
    title: "Come back and check",
    body: (
      <>
        Click <b>Check again</b>. Most domains go live within a few minutes; some take a few
        hours. Once it says <b>Live</b>, your page is on your domain with HTTPS, and your
        OrangeLink address keeps working too.
      </>
    ),
  },
];

const problems: Step[] = [
  {
    title: "Still waiting after a few hours?",
    body: (
      <>
        Check the record was saved with the exact Name and Value. Some companies add your
        domain to the Name automatically, so type just <code>shop</code> or <code>@</code>, not
        the whole domain.
      </>
    ),
  },
  {
    title: "An old record is in the way",
    body: (
      <>
        If the domain already has an A, AAAA or CNAME record with the same Name (often a
        &quot;parked&quot; page from where you bought it), delete that one. Two records for the
        same name confuse browsers.
      </>
    ),
  },
  {
    title: "Using Cloudflare?",
    body: (
      <>
        The record must be <b>DNS only</b> (grey cloud), not proxied (orange cloud), or HTTPS
        can&apos;t be set up.
      </>
    ),
  },
];

function StepList({ items, numbered }: { items: Step[]; numbered: boolean }) {
  return (
    <ol className="flex flex-col gap-4">
      {items.map((step, i) => (
        <li key={step.title} className="flex gap-3">
          <span className="mt-[3px] w-4 shrink-0 font-mono text-label text-[var(--accent-strong)]">
            {numbered ? String(i + 1).padStart(2, "0") : "·"}
          </span>
          <div className="min-w-0">
            <p className="text-h3">{step.title}</p>
            <div className="mt-0.5 text-small leading-relaxed text-text-secondary [&_b]:font-medium [&_b]:text-text-primary [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-text-primary">
              {step.body}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * How to connect a domain, step by step, with where to click at the common
 * domain companies. Open until the domain is live, then folded away.
 */
export function DomainGuide({ open }: { open: boolean }) {
  return (
    <details
      open={open}
      className="group max-w-xl rounded-md border border-border bg-surface-1 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
        <span>
          <span className="block text-h3">How to connect your domain</span>
          <span className="mt-0.5 block text-small text-text-secondary">
            About 10 minutes, plus a short wait for the internet to catch up.
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-6 border-t border-border p-4 pt-5">
        <div>
          <p className="mb-3 font-mono text-label uppercase tracking-[0.1em] text-text-muted">Steps</p>
          <StepList items={steps} numbered />
        </div>
        <div>
          <p className="mb-3 font-mono text-label uppercase tracking-[0.1em] text-text-muted">
            If it isn&apos;t working
          </p>
          <StepList items={problems} numbered={false} />
        </div>
      </div>
    </details>
  );
}
