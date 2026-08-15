import { AdminShell } from "@/components/admin/admin-shell";
import { ScannerModule } from "@/components/admin/scanner-module";

export default function AdminScannerPage() {
  return (
    <AdminShell>
      <ScannerModule />
    </AdminShell>
  );
}
