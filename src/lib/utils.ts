import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge only knows Tailwind's built-in size names, so it read the
// project's type scale (text-body, text-small, ...) as text *colours* and
// dropped whichever of `text-small` / `text-white` came first. Buttons lost
// their font size that way. Registering the scale as font sizes lets a size
// and a colour sit side by side, as they should.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "h3", "body-lg", "body", "small", "label"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
