import { addableBlockTypes, blockTypeMeta } from "@/lib/block-defaults";
import type { BlockType } from "@/lib/types";

export function BlockLibrary({
  onAdd,
}: {
  onAdd: (type: BlockType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
      {addableBlockTypes.map((type) => {
        const meta = blockTypeMeta[type];
        return (
          <button
            key={type}
            type="button"
            onClick={() => onAdd(type)}
            className="flex items-center gap-3 rounded-md border border-border bg-surface-1 px-3 py-2.5 text-left text-body text-text-primary transition-colors duration-[170ms] hover:border-border-strong hover:bg-surface-2"
          >
            <meta.icon className="h-4 w-4 shrink-0 text-text-secondary" />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
