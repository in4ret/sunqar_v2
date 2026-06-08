import { getCurrentUser } from "@/lib/auth/auth";
import { deleteCompletedTaskById } from "@/lib/tasks";

type TaskRouteProps = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function DELETE(_request: Request, { params }: TaskRouteProps) {
  const user = await getCurrentUser();

  if (!user) {
    return buildJsonResponse({ error: "Unauthorized." }, 401);
  }

  const { taskId } = await params;
  const isDeleted = await deleteCompletedTaskById(taskId, user.id);

  if (!isDeleted) {
    return buildJsonResponse({ error: "Task not found or not completed." }, 404);
  }

  return buildJsonResponse({ success: true }, 200);
}

function buildJsonResponse(payload: Record<string, string | boolean>, status: number) {
  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });
}
