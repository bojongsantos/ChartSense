import { AdminShell } from "@/components/admin/admin-shell";
import { HealthModule } from "@/components/admin/health-module";

export default function AdminHealthPage() {
  return (
    <AdminShell>
      <HealthModule />
    </AdminShell>
  );
}
