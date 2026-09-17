import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireCreator } from "@/lib/queries/dashboard";
import { AvatarUploader } from "@/components/dashboard/avatar-uploader";
import { updateProfile } from "./actions";

export default async function SettingsPage() {
  const { creator } = await requireCreator();

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
    </div>
  );
}
