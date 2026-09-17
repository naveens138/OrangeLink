import {
  BarChart3,
  Download,
  Mail,
  Palette,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

interface StackRow {
  icon: LucideIcon;
  title: string;
  replaces: string;
  price: string;
  /** Dollars counted into the "otherwise" total. */
  value: number;
}

const rows: StackRow[] = [
  {
    icon: ShoppingBag,
    title: "Store and checkout",
    replaces: "Replaces Linktree, Stan",
    price: "$29",
    value: 29,
  },
  {
    icon: Mail,
    title: "Email list",
    replaces: "Replaces ConvertKit, Beehiiv",
    price: "$29",
    value: 29,
  },
  {
    icon: BarChart3,
    title: "Sales analytics",
    replaces: "Replaces Google Analytics",
    price: "$10",
    value: 10,
  },
  {
    icon: Palette,
    title: "Page design",
    replaces: "Replaces Webflow, Framer",
    price: "$20",
    value: 20,
  },
  {
    icon: Download,
    title: "Import from other platforms",
    replaces: "",
    price: "Free",
    value: 0,
  },
];

const otherwiseTotal = rows.reduce((sum, row) => sum + row.value, 0);

// PLACEHOLDER — OrangeLink's monthly price is not finalised. This is
// intentionally not a real number; replace it once pricing is decided.
// It is the platform's only charge: sales settle into the creator's own
// Razorpay account, so there is no per-sale cut to add to it.
const ORANGELINK_PRICE = "TBD";

export function ValueStack() {
  return (
    <div className="border border-border bg-background">
      {rows.map((row) => {
        const Icon = row.icon;
        return (
          <div
            key={row.title}
            className="group flex items-start gap-4 border-b border-border px-5 py-4 transition-colors duration-200 hover:bg-surface-1 sm:px-6 sm:py-5"
          >
            <Icon
              className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary transition-colors duration-200 group-hover:text-accent"
              strokeWidth={1.25}
            />
            <div className="min-w-0 flex-1">
              <p className="t-heading">{row.title}</p>
              {row.replaces && (
                <p className="t-small mt-0.5 text-text-secondary">
                  {row.replaces}
                </p>
              )}
            </div>
            <span className="t-body shrink-0 font-medium tabular-nums text-text-primary">
              {row.price}
            </span>
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <span className="t-body text-text-secondary line-through decoration-[var(--strike)] decoration-1">
          What you&apos;d pay elsewhere
        </span>
        <span
          className="t-body shrink-0 tabular-nums line-through decoration-1"
          style={{ color: "var(--strike)", textDecorationColor: "var(--strike)" }}
        >
          ${otherwiseTotal}/mo
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-6">
        <span className="t-heading">OrangeLink</span>
        <span className="t-title shrink-0 tabular-nums">
          {ORANGELINK_PRICE}
          {/* No "/mo" while the price is a placeholder: "TBD/mo" reads as a
              broken value rather than an undecided one. */}
          {ORANGELINK_PRICE !== "TBD" && (
            <span className="t-body font-normal text-text-secondary">/mo</span>
          )}
        </span>
      </div>
    </div>
  );
}
