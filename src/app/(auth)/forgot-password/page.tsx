import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="glass rounded-[30px] p-7 sm:p-9">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <KeyRound className="h-6 w-6" />
      </span>
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Forgot your password?</h1>
      <p className="mt-2 text-[15px] text-muted">No problem. It takes two steps:</p>
      <ol className="mt-5 space-y-4 text-[15px]">
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold">1</span>
          <span>Ask your admin for a <strong>reset code</strong>. They make one for you in a few seconds.</span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold">2</span>
          <span>Enter your email, the code and a new password on the next page. The code works once and lasts 1 hour.</span>
        </li>
      </ol>
      <Link
        href="/reset-password"
        className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-base font-medium text-white shadow-[0_6px_20px_-6px_var(--accent)] transition-[transform,filter] duration-200 hover:brightness-110 active:scale-[0.97]"
      >
        I have a code <ArrowRight className="h-[18px] w-[18px]" />
      </Link>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
