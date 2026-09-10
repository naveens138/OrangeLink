import { type ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: (props: { id: string; "aria-describedby"?: string }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const describedBy = error
    ? `${id}-error`
    : hint
      ? `${id}-hint`
      : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="font-mono text-label font-medium uppercase tracking-[0.1em] text-text-muted"
      >
        {label}
      </label>
      {children({ id, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-small text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-small text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
