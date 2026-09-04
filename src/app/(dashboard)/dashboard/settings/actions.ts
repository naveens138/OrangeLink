"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // username is intentionally not accepted here — it is the public URL, and
  // changing it breaks every link already shared. RLS scopes this update to
  // the caller's own row regardless of what id is passed.
  await supabase
    .from("creators")
    .update({
      display_name: String(formData.get("display_name") ?? "").slice(0, 80),
      bio: String(formData.get("bio") ?? "").slice(0, 300),
    })
    .eq("id", user.id);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}
