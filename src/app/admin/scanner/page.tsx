import { AdminShell } from "@/presentation/features/admin/admin-shell";
import { ScannerModule } from "@/presentation/features/admin/scanner-module";

export default function AdminScannerPage() {
  return (
    <AdminShell>
      <ScannerModule />
    </AdminShell>
  );
}
