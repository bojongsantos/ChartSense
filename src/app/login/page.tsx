import { Suspense } from "react";
import { AuthForm } from "@/presentation/features/auth/auth-form";

export default function LoginPage() {
  return <Suspense><AuthForm mode="login" /></Suspense>;
}
