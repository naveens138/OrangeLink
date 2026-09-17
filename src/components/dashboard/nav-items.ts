import {
  LayoutGrid,
  Link2,
  Package,
  ShoppingBag,
  BarChart3,
  CreditCard,
  Mail,
  Globe,
  Upload,
  CalendarClock,
  Gift,
  Settings,
  LayoutTemplate,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Sidebar section heading this item sits under. */
  group: "Page" | "Sell" | "Grow" | "Account";
  /** shown in the mobile bottom nav; the rest live behind "More" */
  primary?: boolean;
}

// In group order, so the position in this list doubles as the page's
// "01 / overview" index, the way the landing page numbers its sections.
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid, group: "Page", primary: true },
  { href: "/dashboard/links", label: "Links", icon: Link2, group: "Page", primary: true },
  { href: "/dashboard/products", label: "Products", icon: Package, group: "Page", primary: true },
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate, group: "Page" },
  { href: "/dashboard/import", label: "Import", icon: Upload, group: "Page" },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag, group: "Sell", primary: true },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard, group: "Sell" },
  { href: "/dashboard/schedule", label: "Schedule", icon: CalendarClock, group: "Grow" },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, group: "Grow" },
  { href: "/dashboard/email", label: "Email", icon: Mail, group: "Grow" },
  { href: "/dashboard/domains", label: "Domains", icon: Globe, group: "Grow" },
  { href: "/creator-program", label: "Creator Program", icon: Gift, group: "Grow" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, group: "Account" },
];

export function isActive(item: NavItem, pathname: string) {
  return item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
}
