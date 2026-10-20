import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Fx } from "@/components/fx";

export const metadata: Metadata = {
  title: { default: "AngleOS", template: "%s · AngleOS" },
  description: "Private ad-creative workspace.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0d",
};

// Runs before the page paints so there is no flash of the wrong theme.
const themeScript = `try{var t=localStorage.getItem("angleos-theme");document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark")}catch(e){document.documentElement.setAttribute("data-theme","dark")}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Fx />
        {children}
      </body>
    </html>
  );
}
