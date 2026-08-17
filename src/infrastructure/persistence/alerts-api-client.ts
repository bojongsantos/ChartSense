import type { AlertCondition, AlertStatus } from "@/core/domain/alerts/alert-rules";

export interface PriceAlertDto {
  id: string;
  symbol: string;
  condition: AlertCondition;
  threshold: number;
  status: AlertStatus;
  note: string | null;
  triggeredAt: string | null;
  triggeredPrice: number | null;
  createdAt: string;
}

export interface AlertListDto {
  alerts: PriceAlertDto[];
  limit: number;
}

async function readError(response: Response, fallback: string): Promise<never> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;
  throw new Error(payload?.error?.message ?? fallback);
}

export async function fetchAlerts(): Promise<AlertListDto> {
  const response = await fetch("/api/alerts", { cache: "no-store" });
  if (!response.ok) await readError(response, "Alert gagal dimuat.");
  return (await response.json()) as AlertListDto;
}

export async function createAlert(input: {
  symbol: string;
  condition: AlertCondition;
  threshold: number;
  note?: string;
}): Promise<PriceAlertDto> {
  const response = await fetch("/api/alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) await readError(response, "Alert gagal dibuat.");
  const payload = (await response.json()) as { alert: PriceAlertDto };
  return payload.alert;
}

export async function setAlertStatus(id: string, status: "ACTIVE" | "PAUSED"): Promise<void> {
  const response = await fetch(`/api/alerts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) await readError(response, "Status alert gagal diubah.");
}

export async function deleteAlert(id: string): Promise<void> {
  const response = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
  if (!response.ok) await readError(response, "Alert gagal dihapus.");
}
