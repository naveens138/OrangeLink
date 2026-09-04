import {
  LayoutGrid,
  Link2,
  Package,
  ShoppingBag,
  BarChart3,
  Zap,
  Mail,
  Globe,
  Upload,
  IdCard,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** shown in the mobile bottom nav; the rest live behind "More" */
  primary?: boolean;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid, primary: true },
  { href: "/dashboard/links", label: "Links", icon: Link2, primary: true },
  {
    href: "/dashboard/products",
    label: "Products",
    icon: Package,
    primary: true,
  },
  {
    href: "/dashboard/orders",
    label: "Orders",
    icon: ShoppingBag,
    primary: true,
  },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/automations", label: "Automations", icon: Zap },
  { href: "/dashboard/email", label: "Email", icon: Mail },
  { href: "/dashboard/domains", label: "Domains", icon: Globe },
  { href: "/dashboard/import", label: "Import", icon: Upload },
  { href: "/dashboard/media-kit", label: "Media Kit", icon: IdCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];
