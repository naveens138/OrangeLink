import "server-only";
import {
  EventName,
  type EventEntity,
  type SubscriptionCreatedEvent,
  type SubscriptionUpdatedEvent,
  type SubscriptionCanceledEvent,
  type CustomerCreatedEvent,
  type CustomerUpdatedEvent,
} from "@paddle/paddle-node-sdk";
import { createServiceRoleClient } from "@/lib/supabase/server";

type SubscriptionEvent =
  | SubscriptionCreatedEvent
  | SubscriptionUpdatedEvent
  | SubscriptionCanceledEvent;

/**
 * Routes one verified Paddle event to its handler. UPSERT-shaped throughout
 * (keyed on Paddle's own ids), so a duplicate delivery — Paddle delivers
 * at-least-once — just re-writes the same latest state; no separate
 * dedup ledger needed. Runs with the service role: webhooks never carry a
 * signed-in OrangeLink session, so RLS would block every write otherwise
 * (migrations/0008 gives creators read-only access to their own rows).
 */
export async function processPaddleEvent(event: EventEntity): Promise<void> {
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionCanceled:
      return upsertSubscription(event);
    case EventName.CustomerCreated:
    case EventName.CustomerUpdated:
      return upsertCustomer(event);
    default:
      // Subscribed to an event we don't act on yet — no-op, not an error.
      return;
  }
}

async function upsertSubscription(event: SubscriptionEvent): Promise<void> {
  const supabase = createServiceRoleClient();
  const sub = event.data;
  const item = sub.items[0];

  // The creator this subscription belongs to travels through as custom
  // data set on Checkout.open() (src/app/pricing/pricing-page-client.tsx),
  // the same pattern already used for Dodo/Razorpay orders
  // (orangelink_creator_id in metadata/notes) rather than the generic
  // email-matching approach — OrangeLink already knows the creator's id
  // at checkout time since Subscribe requires being signed in.
  const creatorId =
    typeof sub.customData?.orangelink_creator_id === "string"
      ? sub.customData.orangelink_creator_id
      : null;

  const { error } = await supabase.from("paddle_subscriptions").upsert({
    id: sub.id,
    customer_id: sub.customerId,
    creator_id: creatorId,
    status: sub.status,
    price_id: item?.price?.id ?? "",
    product_id: item?.price?.productId ?? "",
    scheduled_change_at: sub.scheduledChange?.effectiveAt ?? null,
    scheduled_change_action: sub.scheduledChange?.action ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

async function upsertCustomer(event: CustomerCreatedEvent | CustomerUpdatedEvent): Promise<void> {
  const supabase = createServiceRoleClient();
  const customer = event.data;

  // No creator_id here: Paddle attaches our Checkout.open() customData to
  // the transaction/subscription it creates, not to the customer record
  // itself, so there's nothing reliable to read it from at this point.
  // paddle_subscriptions.creator_id (set in upsertSubscription, which does
  // get real customData) is the source of truth for "which creator".
  const { error } = await supabase.from("paddle_customers").upsert({
    id: customer.id,
    email: customer.email,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}
