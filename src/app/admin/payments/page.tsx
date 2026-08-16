import { AdminShell } from "@/presentation/features/admin/admin-shell";
import { PaymentsModule } from "@/presentation/features/admin/payments-module";

export default function AdminPaymentsPage() { return <AdminShell><PaymentsModule /></AdminShell>; }
