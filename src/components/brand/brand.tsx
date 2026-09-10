import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The OrangeLink mark and wordmark, as the landing page nav sets them: the
 * orange slice beside "OrangeLink" in small, tight, semibold type. One
 * component so every surface shows the same logo; swap the image by
 * replacing brand/logo-source.webp and running scripts/build-brand-icons.mjs.
 */
export function BrandMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo-orange.png"
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function BrandLockup({
  size = 20,
  className,
  children,
}: {
  size?: number;
  className?: string;
  /** Anything after the wordmark, e.g. an "/ admin" suffix. */
  children?: React.ReactNode;
}) {
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <BrandMark size={size} />
      <span className="text-[13px] font-semibold tracking-[-0.02em] text-text-primary">
        OrangeLink
      </span>
      {children}
    </span>
  );
}
