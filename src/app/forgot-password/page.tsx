import { Suspense } from "react";
import { PasswordRecoveryForm } from "@/presentation/features/auth/password-recovery-form";

export default function ForgotPasswordPage() { return <Suspense><PasswordRecoveryForm mode="request" /></Suspense>; }
