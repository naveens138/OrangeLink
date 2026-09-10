import { ShoppingBag } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Orders</h1>
        <p className="mt-1 text-body text-text-secondary">
          Order history and customer lifetime value.
        </p>
      </div>
      <ComingSoon
        icon={ShoppingBag}
        title="Orders & customer LTV"
        description="Order list backed by the orders/order_items/customers tables, with denormalized lifetime value for fast CRM-lite segmentation."
        milestone="Milestone 4: Products & Checkout"
      />
    </div>
  );
}
