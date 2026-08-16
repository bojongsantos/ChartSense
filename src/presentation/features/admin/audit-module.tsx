"use client";

import { useEffect, useState } from "react";

interface AuditRow { id: string; action: string; entityType: string; entityId: string | null; ipAddress: string | null; createdAt: string; actor: { name: string; email: string } | null }

export function AuditModule() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  useEffect(() => { const controller = new AbortController(); fetch("/api/admin/audit-logs", { cache: "no-store", signal: controller.signal }).then((response) => response.json()).then((payload: { logs?: AuditRow[] }) => setLogs(payload.logs ?? [])).catch(() => undefined); return () => controller.abort(); }, []);
  return <div className="p-6"><h2 className="text-lg font-bold">Audit Log</h2><p className="mt-1 text-xs text-muted">200 aktivitas backend terbaru.</p><div className="mt-5 overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[800px] text-left text-xs"><thead className="bg-surface-3 text-muted"><tr><th className="p-3">Time</th><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">IP</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-t border-border"><td className="p-3">{new Date(log.createdAt).toLocaleString("id-ID")}</td><td className="p-3">{log.actor?.email ?? "System"}</td><td className="p-3 font-mono">{log.action}</td><td className="p-3">{log.entityType}<p className="font-mono text-muted">{log.entityId}</p></td><td className="p-3 font-mono">{log.ipAddress ?? "—"}</td></tr>)}</tbody></table></div></div>;
}
