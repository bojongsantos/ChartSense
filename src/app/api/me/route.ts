import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { apiError } from "@/shared/server/http";

export async function GET() {
  try {
    return Response.json({ user: await getCurrentUser() });
  } catch (error) {
    return apiError(error);
  }
}
