import { AdminShell } from "@/presentation/features/admin/admin-shell";
import { GatingModule } from "@/presentation/features/admin/gating-module";

export default function AdminGatingPage() {
  return (
    <AdminShell>
      <GatingModule />
    </AdminShell>
  );
}
