import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireCreator } from "@/lib/queries/dashboard";
import { updateProfile } from "./actions";

export default async function SettingsPage() {
  const { creator } = await requireCreator();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Settings</h1>
        <p className="mt-1 text-body text-text-secondary">
          Profile, plan, and account details.
        </p>
      </div>

      <Card className="max-w-xl">
        <h2 className="text-h3">Profile</h2>
        <form action={updateProfile} className="mt-5 flex flex-col gap-4">
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
            hint={`orangelink.co/${creator.username} — changing this breaks existing links.`}
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
