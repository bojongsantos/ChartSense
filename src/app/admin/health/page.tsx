import { AdminShell } from "@/presentation/features/admin/admin-shell";
import { HealthModule } from "@/presentation/features/admin/health-module";

export default function AdminHealthPage() {
  return (
    <AdminShell>
      <HealthModule />
    </AdminShell>
  );
}
