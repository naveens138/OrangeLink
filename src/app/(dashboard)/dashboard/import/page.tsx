import { ImportWizard } from "@/components/import/import-wizard";
import { SUPPORTED_PLATFORM_LABELS } from "@/lib/import/platforms";
import { requireCreator } from "@/lib/queries/dashboard";

export default async function ImportPage() {
  await requireCreator();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Import</h1>
        <p className="mt-1 text-body text-text-secondary">
          Bring your links over from Linktree, Stan and others.
        </p>
      </div>
      <ImportWizard supportedPlatforms={SUPPORTED_PLATFORM_LABELS} />
    </div>
  );
}
