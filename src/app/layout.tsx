import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OrangeLink",
  description: "One page for your links, your storefront, and your audience.",
};

// Runs before hydration to set data-theme from localStorage and avoid a
// flash of the wrong theme on load.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('orangelink-theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-text-primary">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        {/* TEMPORARY — Figma html-to-design capture. Dev-only so it can
            never reach production; remove once the design is in Figma. */}
        {process.env.NODE_ENV === "development" && (
          <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async />
        )}
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
