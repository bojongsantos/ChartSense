import { AdminShell } from "@/components/admin/admin-shell";
import { WatchlistModule } from "@/components/admin/watchlist-module";

export default function AdminWatchlistPage() {
  return (
    <AdminShell>
      <WatchlistModule />
    </AdminShell>
  );
}
