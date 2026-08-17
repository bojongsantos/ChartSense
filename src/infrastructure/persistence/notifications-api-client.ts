export type NotificationKind = "ALERT_TRIGGERED" | "SETUP_RESOLVED" | "BILLING" | "SYSTEM";

export interface NotificationDto {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationFeedDto {
  notifications: NotificationDto[];
  unreadCount: number;
}

export async function fetchNotifications(): Promise<NotificationFeedDto> {
  const response = await fetch("/api/notifications", { cache: "no-store" });
  if (!response.ok) throw new Error("Notifikasi gagal dimuat.");
  return (await response.json()) as NotificationFeedDto;
}

export async function markNotificationRead(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetch("/api/notifications", { method: "PATCH" });
}
