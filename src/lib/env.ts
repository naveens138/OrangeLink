export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isDodoConfigured() {
  return Boolean(process.env.DODO_PAYMENTS_API_KEY);
}

// Razorpay is no longer configured at the platform level: each creator
// connects their own account (migrations/0011), so "are payments set up" is
// a per-creator question answered by getCreatorPaymentCredentials(), not by
// an env var.
