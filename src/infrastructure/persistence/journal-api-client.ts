import type { SetupOutcome } from "@/core/domain/journal/setup-outcome";
import type { SetupDirection, Timeframe } from "@/core/domain/models";

export interface JournalEntryDto {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  direction: SetupDirection;
  entry: number;
  target1: number;
  target2: number;
  stopLoss: number;
  riskReward: number;
  confidence: number;
  outcome: SetupOutcome;
  closedPrice: number | null;
  closedAt: string | null;
  createdAt: string;
}

export interface JournalListDto {
  entries: JournalEntryDto[];
  stats: {
    total: number;
    open: number;
    wins: number;
    losses: number;
    winRate: number | null;
  };
}

export interface SaveSetupInput {
  symbol: string;
  timeframe: Timeframe;
  direction: SetupDirection;
  entry: number;
  target1: number;
  target2: number;
  stopLoss: number;
  riskReward: number;
  confidence: number;
}

async function readError(response: Response, fallback: string): Promise<never> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;
  throw new Error(payload?.error?.message ?? fallback);
}

export async function fetchJournal(): Promise<JournalListDto> {
  const response = await fetch("/api/history", { cache: "no-store" });
  if (!response.ok) await readError(response, "Riwayat gagal dimuat.");
  return (await response.json()) as JournalListDto;
}

export async function saveSetupToJournal(input: SaveSetupInput): Promise<JournalEntryDto> {
  const response = await fetch("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) await readError(response, "Setup gagal disimpan.");
  const payload = (await response.json()) as { entry: JournalEntryDto };
  return payload.entry;
}

export async function cancelJournalEntry(id: string): Promise<void> {
  const response = await fetch(`/api/history/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outcome: "CANCELED" }),
  });
  if (!response.ok) await readError(response, "Setup gagal dibatalkan.");
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const response = await fetch(`/api/history/${id}`, { method: "DELETE" });
  if (!response.ok) await readError(response, "Entri gagal dihapus.");
}
