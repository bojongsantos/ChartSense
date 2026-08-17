import { requireUser } from "@/infrastructure/auth/current-user";
import { prisma } from "@/infrastructure/database/prisma";
import { apiError } from "@/shared/server/http";

/** Most recent notifications shown in the bell dropdown. */
const FEED_SIZE = 30;

export async function GET() {
  try {
    const user = await requireUser();
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: FEED_SIZE,
        select: {
          id: true,
          kind: true,
          title: true,
          body: true,
          link: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return Response.json({ notifications, unreadCount });
  } catch (error) {
    return apiError(error);
  }
}

/** Marks every unread notification for the signed-in user as read. */
export async function PATCH() {
  try {
    const user = await requireUser();
    const result = await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return Response.json({ updated: result.count });
  } catch (error) {
    return apiError(error);
  }
}
