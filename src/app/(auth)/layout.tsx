import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSession()) redirect("/");
  return (
    <div className="backdrop-glow relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Logo className="reveal mb-8 scale-110" />
      <main className="reveal w-full max-w-[420px]" style={{ "--i": 2 } as React.CSSProperties}>
        {children}
      </main>
      <p className="mt-8 text-center text-xs text-muted">Private workspace · invite only</p>
    </div>
  );
}
