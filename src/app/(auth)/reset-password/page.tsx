import type { Metadata } from "next";
import { ResetForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Set a new password" };

export default function ResetPasswordPage() {
  return <ResetForm />;
}
