export const routes = {
  account: "/account",
  aiModels: "/ai_models",
  home: "/",
  login: "/login",
  taskApi: "/api/tasks",
  tasks: "/tasks",
  newReport: "/reports/new",
  reports: "/reports",
  sources: "/sources",
  users: "/users",
} as const;

export function getReportEditRoute(reportId: string) {
  return `${routes.reports}/${reportId}/edit`;
}

export function getTaskPreviewRoute(taskId: string) {
  return `${routes.tasks}/${taskId}`;
}

export function getTaskRoute(taskId: string) {
  return `${routes.taskApi}/${taskId}`;
}
