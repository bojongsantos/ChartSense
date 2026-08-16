import { redirect } from "next/navigation";
import { getCurrentUser } from "@/infrastructure/auth/current-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/");
  return children;
}
