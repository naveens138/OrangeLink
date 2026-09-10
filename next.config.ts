import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keeps a visited dashboard tab in the browser for 30s, so switching
    // back to it is instant instead of another server round trip. Every
    // dashboard save calls revalidatePath, which clears this cache, so an
    // edit is never hidden behind a stale copy.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
