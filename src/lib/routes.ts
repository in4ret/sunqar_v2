export const routes = {
  account: "/account",
  aiModels: "/ai_models",
  home: "/",
  login: "/login",
  news: "/news",
  taskApi: "/api/tasks",
  taskStreamApi: "/api/tasks/stream",
  tasks: "/tasks",
  newReport: "/reports/new",
  reports: "/reports",
  sources: "/sources",
  users: "/users",
} as const;

export function getReportEditRoute(reportId: string) {
  return `${routes.reports}/${reportId}/edit`;
}

export function getTaskDownloadRoute(taskId: string) {
  return `${routes.tasks}/${taskId}`;
}

export function getTaskRoute(taskId: string) {
  return `${routes.taskApi}/${taskId}`;
}
