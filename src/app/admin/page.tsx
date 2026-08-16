import { AdminShell } from "@/presentation/features/admin/admin-shell";
import { Overview } from "@/presentation/features/admin/overview";

export default function AdminOverviewPage() {
  return (
    <AdminShell>
      <Overview />
    </AdminShell>
  );
}
