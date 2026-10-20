import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="backdrop-glow flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo className="mb-8" />
      <h1 className="text-[28px] font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted">That page doesn't exist, or you don't have access to it.</p>
      <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-full bg-accent px-5 font-medium text-white">
        Back to dashboard
      </Link>
    </div>
  );
}
