import { AdminShell } from "@/presentation/features/admin/admin-shell";
import { UsersModule } from "@/presentation/features/admin/users-module";

export default function AdminUsersPage() { return <AdminShell><UsersModule /></AdminShell>; }
