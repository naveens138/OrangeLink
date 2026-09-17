import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireCreator } from "@/lib/queries/dashboard";
import { AvatarUploader } from "@/components/dashboard/avatar-uploader";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import Link from "next/link";
import { getApprovedCount, PROGRAM_CAP } from "@/lib/creator-program";
import { updateProfile } from "./actions";

export default async function SettingsPage() {
  const { creator } = await requireCreator();

  // Read with the creator's own session: RLS only returns their rows.
  const supabase = await createClient();
  const [{ data: submission }, { data: override }, approvedCount] = await Promise.all([
    supabase
      .from("creator_program_submissions")
      .select("status")
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ status: "pending" | "approved" | "rejected" }>(),
    supabase.from("billing_overrides").select("free_until").maybeSingle<{ free_until: string }>(),
    getApprovedCount(),
  ]);
  const spotsLeft = Math.max(PROGRAM_CAP - approvedCount, 0);
  const program: { body: string; cta?: string } = override
    ? { body: `You're in. Your free year runs until ${formatDate(override.free_until)}.` }
    : submission?.status === "pending"
      ? { body: "Your reel is in review. We'll get back to you within 48 hours." }
      : spotsLeft === 0
        ? { body: "All 100 spots are claimed. Join the waitlist for the next round.", cta: "Join the waitlist" }
        : submission?.status === "rejected"
          ? { body: "Your last reel didn't qualify. You can submit a new one.", cta: "Submit a new reel" }
          : {
              body: `Post a reel showing how you use OrangeLink and get a year free. ${spotsLeft} of ${PROGRAM_CAP} spots left.`,
              cta: "See how it works",
            };

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

      <Card className="max-w-xl">
        <h2 className="text-h3">Creator Program</h2>
        <p className="mt-1 text-body text-text-secondary">{program.body}</p>
        {program.cta && (
          <Link
            href="/creator-program"
            className="mt-4 inline-flex h-9 items-center rounded-md bg-text-primary px-3.5 text-small font-medium text-white transition-[opacity,transform] duration-100 hover:opacity-90 active:scale-[0.97]"
          >
            {program.cta}
          </Link>
        )}
      </Card>
    </div>
  );
}
