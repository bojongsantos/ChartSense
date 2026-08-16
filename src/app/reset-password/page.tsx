import { Suspense } from "react";
import { PasswordRecoveryForm } from "@/presentation/features/auth/password-recovery-form";

export default function ResetPasswordPage() { return <Suspense><PasswordRecoveryForm mode="reset" /></Suspense>; }
