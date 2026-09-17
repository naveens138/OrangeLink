import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireCreator } from "@/lib/queries/dashboard";
import { AvatarUploader } from "@/components/dashboard/avatar-uploader";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import Link from "next/link";
import { updateProfile } from "./actions";

export default async function SettingsPage() {
  const { creator } = await requireCreator();

  // Read with the creator's own session: RLS only returns their rows.
  const supabase = await createClient();
  const [{ data: submission }, { data: override }] = await Promise.all([
    supabase
      .from("creator_program_submissions")
      .select("status")
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ status: "pending" | "approved" | "rejected" }>(),
    supabase.from("billing_overrides").select("free_until").maybeSingle<{ free_until: string }>(),
  ]);
  const program = override
    ? { title: "Free year active", body: `From the Creator Program. Free until ${formatDate(override.free_until)}.` }
    : submission?.status === "pending"
      ? { title: "Reel in review", body: "We'll review your Creator Program reel within 48 hours." }
      : submission?.status === "rejected"
        ? { title: "Reel not approved", body: "Your last reel didn't qualify. You can submit a new one." }
        : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Settings</h1>
        <p className="mt-1 text-body text-text-secondary">
          Your profile, plan and account.
        </p>
      </div>

      <Card className="max-w-xl">
        <h2 className="text-h3">Profile</h2>
        <div className="mt-5">
          <AvatarUploader
            initialUrl={creator.avatar_url}
            name={creator.display_name ?? creator.username}
          />
        </div>
        <form action={updateProfile} className="mt-6 flex flex-col gap-4">
          <Field label="Display name">
            {(p) => (
              <Input
                {...p}
                name="display_name"
                defaultValue={creator.display_name ?? ""}
              />
            )}
          </Field>
          <Field
            label="Username"
            hint={`orangelink.in/${creator.username}. Changing this breaks existing links.`}
          >
            {(p) => (
              <Input {...p} defaultValue={creator.username} disabled />
            )}
          </Field>
          <Field label="Bio">
            {(p) => (
              <Input {...p} name="bio" defaultValue={creator.bio ?? ""} />
            )}
          </Field>
          <Button type="submit" className="mt-2 w-fit">
            Save changes
          </Button>
        </form>
      </Card>

      {program && (
        <Card className="max-w-xl">
          <h2 className="text-h3">{program.title}</h2>
          <p className="mt-1 text-body text-text-secondary">{program.body}</p>
          {submission?.status === "rejected" && !override && (
            <Link href="/creator-program#submit" className="mt-3 inline-block text-small font-medium text-accent">
              Submit a new reel
            </Link>
          )}
        </Card>
      )}
    </div>
  );
}
