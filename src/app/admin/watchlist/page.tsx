import { AdminShell } from "@/presentation/features/admin/admin-shell";
import { WatchlistModule } from "@/presentation/features/watchlist/watchlist-module";

export default function AdminWatchlistPage() {
  return (
    <AdminShell>
      <WatchlistModule />
    </AdminShell>
  );
}
