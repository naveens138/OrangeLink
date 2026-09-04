import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

/**
 * Gate for /admin/*. Deliberately does not distinguish "not signed in"
 * from "signed in but not an admin" in where it sends you — both land on
 * ordinary app pages, not a "you're not authorized" screen that would
 * confirm an admin area exists at this path to anyone who stumbles onto it.
 */
export async function requireAdmin(): Promise<{ email: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/dashboard");

  return { email: user.email! };
}
